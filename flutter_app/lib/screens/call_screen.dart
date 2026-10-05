import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/token_service.dart';

// 디자인 토큰
const _sky = Color(0xFFEAF6FF);
const _blue = Color(0xFF1A3A8A);
const _yellow = Color(0xFFFFC93C);
const _red = Color(0xFFF2493B);
const _green = Color(0xFF3BC46B);
const _gray = Color(0xFFD5D9E3);
const _grayDot = Color(0xFF9AA3B8);
const _ink = Color(0xFF142447);

// 글꼴 (assets/fonts)
const _display = 'Black Han Sans';
const _hand = 'Gaegu';
const _round = 'Jua';

/// 화면에 보이는 통화 상태
enum _Phase {
  noLink,
  verifying,
  idle,
  connecting,
  ready,
  listening,
  answering,
  ended,
}

final _orderIdPattern = RegExp(r'^[A-Za-z0-9_-]{4,64}$');

/// 상담 링크(https://<도메인>/<주문번호>)에서 주문번호를 읽는다. 없거나 형식이 다르면 null.
String? _orderIdFromUrl() {
  if (!kIsWeb) return null;
  final segments = Uri.base.pathSegments.where((s) => s.isNotEmpty);
  if (segments.length != 1) return null;
  return _orderIdPattern.hasMatch(segments.first) ? segments.first : null;
}

class CallScreen extends StatefulWidget {
  const CallScreen({super.key});

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final _room = Room(
    roomOptions: const RoomOptions(adaptiveStream: true, dynacast: true),
  );
  late final EventsListener<RoomEvent> _listener;
  final _tokenService = TokenService();
  final String? _orderId = _orderIdFromUrl();
  // 주문 페이지에서 본인 확인을 마친 고객에게 붙어 오는 입장권
  final String? _ticket = kIsWeb ? Uri.base.queryParameters['t'] : null;
  // 입장권이 필요한지 확인 중이거나 본인 확인 페이지로 넘어가는 중
  bool _verifying = false;

  bool _connected = false;
  bool _ended = false;
  bool _agentSpeaking = false;
  bool _userSpeaking = false;
  bool _loading = false;
  bool _needsAudioUnlock = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _listener = _room.createListener();
    _requireTicketIfNeeded();

    _listener.on<ParticipantConnectedEvent>((_) {});

    _listener.on<TrackSubscribedEvent>((e) async {
      if (e.track is RemoteAudioTrack) {
        // 트랙 도착 시 오디오 잠금 해제 버튼 표시 (Chrome 자동재생 정책 대응)
        setState(() => _needsAudioUnlock = true);
      }
    });

    _listener.on<ActiveSpeakersChangedEvent>((e) {
      setState(() {
        _agentSpeaking = e.speakers.any((p) => p is RemoteParticipant);
        _userSpeaking = e.speakers.any((p) => p is LocalParticipant);
      });
    });

    _listener.on<RoomDisconnectedEvent>((_) {
      setState(() {
        _ended = _connected || _ended;
        _connected = false;
        _agentSpeaking = false;
        _userSpeaking = false;
        _needsAudioUnlock = false;
      });
    });
  }

  /// 본인 확인이 필요한데 입장권 없이 들어왔으면 인증 페이지로 보낸다.
  Future<void> _requireTicketIfNeeded() async {
    final orderId = _orderId;
    if (orderId == null || _ticket != null) return;

    _verifying = true;
    try {
      final config = await _tokenService.fetchConfig();
      if (config.required) {
        await _goToAuth('${config.authUrl}/$orderId');
        return;
      }
    } catch (_) {
      // 설정을 못 읽으면 그대로 두고, 상담 시작 때 서버가 다시 판단한다
    }
    if (mounted) setState(() => _verifying = false);
  }

  Future<void> _goToAuth(String url) async {
    setState(() => _verifying = true);
    await launchUrl(Uri.parse(url), webOnlyWindowName: '_self');
  }

  @override
  void dispose() {
    _listener.dispose();
    _room.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      setState(() {
        _loading = false;
        _error = '마이크 사용을 허용해 주세요.';
      });
      return;
    }

    try {
      final tokenResponse = await _tokenService.fetchToken(
        orderId: _orderId!,
        ticket: _ticket,
        participantName: 'customer',
      );

      await _room.connect(tokenResponse.serverUrl, tokenResponse.token);

      await _room.localParticipant?.setMicrophoneEnabled(true);

      setState(() {
        _connected = true;
        _ended = false;
        _loading = false;
      });
    } on TicketRequiredException catch (e) {
      // 입장권이 만료됐다 — 본인 확인을 다시 받고 돌아온다
      setState(() => _loading = false);
      await _goToAuth(e.authUrl);
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e is TokenRefusedException
            ? e.toString()
            : '연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      });
    }
  }

  Future<void> _disconnect() async {
    await _room.localParticipant?.setMicrophoneEnabled(false);
    await _room.disconnect();
    setState(() {
      _connected = false;
      _ended = true;
      _agentSpeaking = false;
      _userSpeaking = false;
    });
  }

  _Phase get _phase {
    if (_orderId == null) return _Phase.noLink;
    if (_verifying) return _Phase.verifying;
    if (_loading) return _Phase.connecting;
    if (!_connected) return _ended ? _Phase.ended : _Phase.idle;
    if (_agentSpeaking) return _Phase.answering;
    if (_userSpeaking) return _Phase.listening;
    return _Phase.ready;
  }

  String get _bubbleText => switch (_phase) {
    _Phase.noLink => '상담 링크로 접속해 주세요!',
    _Phase.verifying => '본인 확인이 필요해요!',
    _Phase.idle => '무엇이든 물어보세요!',
    _Phase.connecting => '연결하고 있어요…',
    _Phase.ready => '무엇이든 물어보세요!',
    _Phase.listening => '듣고 있어요~',
    _Phase.answering => '답변하고 있어요!',
    _Phase.ended => '상담이 종료됐어요!',
  };

  String get _statusText => switch (_phase) {
    _Phase.noLink => '주문 안내에 있는 상담 링크가 필요합니다',
    _Phase.verifying => '확인하는 중…',
    _Phase.idle => '상담 시작을 눌러 주세요',
    _Phase.connecting => '연결 중…',
    _Phase.ready => '연결됨 — 말씀해 주세요',
    _Phase.listening => '듣는 중…',
    _Phase.answering => '상담원이 말하는 중…',
    _Phase.ended => '통화가 종료되었습니다',
  };

  Color get _statusDot => switch (_phase) {
    _Phase.noLink || _Phase.idle || _Phase.ended => _grayDot,
    _Phase.verifying || _Phase.connecting => _yellow,
    _Phase.listening => _red,
    _Phase.ready || _Phase.answering => _green,
  };

  Color get _micFill => switch (_phase) {
    _Phase.listening => _yellow,
    _Phase.answering => _blue,
    _Phase.noLink || _Phase.ended => _gray,
    _ => Colors.white,
  };

  @override
  Widget build(BuildContext context) {
    final answering = _phase == _Phase.answering;

    return Scaffold(
      backgroundColor: _sky,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 48),
            child: Center(
              child: ConstrainedBox(
                // 화면보다 내용이 짧으면 헤더는 위에, 나머지는 남은 공간 가운데에 둔다
                constraints: BoxConstraints(
                  maxWidth: 560,
                  minHeight: constraints.maxHeight - 76,
                ),
                child: IntrinsicHeight(
                  child: Column(
                    children: [
                      const _Header(),
                      const SizedBox(height: 24),
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _Bubble(text: _bubbleText),
                            const SizedBox(height: 50),
                            _MicButton(
                              fill: _micFill,
                              iconColor: answering ? Colors.white : _blue,
                              icon: answering ? Icons.support_agent : Icons.mic,
                              onTap:
                                  _connected ||
                                      _loading ||
                                      _verifying ||
                                      _orderId == null
                                  ? null
                                  : _connect,
                            ),
                            const SizedBox(height: 28),
                            _StatusPill(
                              text: _statusText,
                              dotColor: _statusDot,
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 14),
                              Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: _red,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                            const SizedBox(height: 36),
                            if (_needsAudioUnlock) ...[
                              _PillButton(
                                label: '소리 켜기',
                                icon: Icons.volume_up,
                                background: _yellow,
                                foreground: _blue,
                                textStyle: const TextStyle(
                                  fontFamily: _round,
                                  fontSize: 19,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 26,
                                  vertical: 10,
                                ),
                                iconSize: 22,
                                onTap: () async {
                                  await _room.startAudio();
                                  setState(() => _needsAudioUnlock = false);
                                },
                              ),
                              const SizedBox(height: 16),
                            ],
                            if (_loading)
                              const SizedBox(
                                height: 58,
                                child: Center(
                                  child: CircularProgressIndicator(
                                    color: _blue,
                                  ),
                                ),
                              )
                            else if (_orderId != null && !_verifying)
                              _PillButton(
                                label: _connected
                                    ? '통화 종료'
                                    : (_ended ? '다시 연결' : '상담 시작'),
                                icon: _connected ? Icons.call_end : Icons.call,
                                background: _connected ? _red : _blue,
                                foreground: Colors.white,
                                textStyle: const TextStyle(
                                  fontFamily: _display,
                                  fontSize: 24,
                                  letterSpacing: 0.5,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 40,
                                  vertical: 14,
                                ),
                                iconSize: 26,
                                onTap: _connected ? _disconnect : _connect,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
          decoration: BoxDecoration(
            color: _blue,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: _yellow,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                '고객 상담',
                style: TextStyle(
                  fontFamily: _round,
                  color: Colors.white,
                  fontSize: 18,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: CustomPaint(
            painter: _DashedLinePainter(),
            size: Size.fromHeight(2),
          ),
        ),
        const SizedBox(width: 12),
        const Text(
          '이심봉사',
          style: TextStyle(fontFamily: _display, color: _blue, fontSize: 20),
        ),
      ],
    );
  }
}

class _DashedLinePainter extends CustomPainter {
  const _DashedLinePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _blue.withValues(alpha: 0.4)
      ..strokeWidth = 2;
    const dash = 6.0, gap = 5.0;
    for (double x = 0; x < size.width; x += dash + gap) {
      canvas.drawLine(
        Offset(x, 1),
        Offset((x + dash).clamp(0, size.width), 1),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontFamily: _hand,
          color: _blue,
          fontSize: 24,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _MicButton extends StatelessWidget {
  const _MicButton({
    required this.fill,
    required this.iconColor,
    required this.icon,
    required this.onTap,
  });

  final Color fill;
  final Color iconColor;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      label: '마이크',
      child: GestureDetector(
        onTap: onTap,
        child: MouseRegion(
          cursor: onTap != null
              ? SystemMouseCursors.click
              : SystemMouseCursors.basic,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 150,
            height: 150,
            decoration: BoxDecoration(
              color: fill,
              shape: BoxShape.circle,
              border: Border.all(color: _blue, width: 3),
            ),
            child: Icon(icon, size: 58, color: iconColor),
          ),
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.text, required this.dotColor});

  final String text;
  final Color dotColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Text(
            text,
            style: const TextStyle(
              fontFamily: _round,
              color: _ink,
              fontSize: 19,
            ),
          ),
        ],
      ),
    );
  }
}

class _PillButton extends StatelessWidget {
  const _PillButton({
    required this.label,
    required this.icon,
    required this.background,
    required this.foreground,
    required this.textStyle,
    required this.padding,
    required this.iconSize,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color background;
  final Color foreground;
  final TextStyle textStyle;
  final EdgeInsets padding;
  final double iconSize;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      shape: const StadiumBorder(),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: padding,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: iconSize, color: foreground),
              const SizedBox(width: 10),
              Text(label, style: textStyle.copyWith(color: foreground)),
            ],
          ),
        ),
      ),
    );
  }
}
