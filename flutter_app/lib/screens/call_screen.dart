import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/token_service.dart';

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

  bool _connected = false;
  bool _agentSpeaking = false;
  bool _userSpeaking = false;
  bool _loading = false;
  bool _needsAudioUnlock = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _listener = _room.createListener();

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
        _connected = false;
        _agentSpeaking = false;
        _userSpeaking = false;
        _needsAudioUnlock = false;
      });
    });
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
        _error = 'Microphone permission denied';
      });
      return;
    }

    try {
      final tokenResponse = await _tokenService.fetchToken(
        participantName: 'customer',
      );

      await _room.connect(
        tokenResponse.serverUrl,
        tokenResponse.token,
      );

      await _room.localParticipant?.setMicrophoneEnabled(true);

      setState(() {
        _connected = true;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _disconnect() async {
    await _room.localParticipant?.setMicrophoneEnabled(false);
    await _room.disconnect();
    setState(() {
      _connected = false;
      _agentSpeaking = false;
      _userSpeaking = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI 고객 상담'),
        centerTitle: true,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _agentSpeaking
                    ? Colors.blue.withValues(alpha: 0.8)
                    : _userSpeaking
                        ? Colors.green.withValues(alpha: 0.8)
                        : _connected
                            ? Colors.grey.withValues(alpha: 0.4)
                            : Colors.grey.withValues(alpha: 0.2),
                boxShadow: (_agentSpeaking || _userSpeaking)
                    ? [
                        BoxShadow(
                          color: (_agentSpeaking ? Colors.blue : Colors.green)
                              .withValues(alpha: 0.4),
                          blurRadius: 20,
                          spreadRadius: 5,
                        )
                      ]
                    : null,
              ),
              child: Icon(
                _agentSpeaking
                    ? Icons.support_agent
                    : _connected
                        ? Icons.mic
                        : Icons.mic_off,
                size: 56,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              _agentSpeaking
                  ? '상담원이 말하는 중...'
                  : _userSpeaking
                      ? '말하는 중...'
                      : _connected
                          ? '연결됨 — 말씀해 주세요'
                          : '연결 안 됨',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
            const SizedBox(height: 40),
            if (_needsAudioUnlock)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await _room.startAudio();
                    setState(() => _needsAudioUnlock = false);
                  },
                  icon: const Icon(Icons.volume_up),
                  label: const Text('🔊 소리 켜기'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            if (_loading)
              const CircularProgressIndicator()
            else
              ElevatedButton.icon(
                onPressed: _connected ? _disconnect : _connect,
                icon: Icon(_connected ? Icons.call_end : Icons.call),
                label: Text(_connected ? '통화 종료' : '상담 시작'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _connected ? Colors.red : Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 40,
                    vertical: 18,
                  ),
                  textStyle: const TextStyle(fontSize: 16),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
