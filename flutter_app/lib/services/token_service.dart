import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

class TokenResponse {
  final String token;
  final String serverUrl;
  final String roomName;

  TokenResponse({
    required this.token,
    required this.serverUrl,
    required this.roomName,
  });

  factory TokenResponse.fromJson(Map<String, dynamic> json) => TokenResponse(
    token: json['token'] as String,
    serverUrl: json['serverUrl'] as String,
    roomName: json['roomName'] as String,
  );
}

class TokenService {
  // 개발: localhost / 프로덕션: --dart-define=API_BASE_URL=https://...
  static const String _configuredBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
  );

  // 웹 빌드는 페이지를 서빙하는 주소의 리버스 프록시(/token)를 그대로 쓴다
  static String get _baseUrl => _configuredBaseUrl.isNotEmpty
      ? _configuredBaseUrl
      : kIsWeb
      ? Uri.base.origin
      : 'http://192.168.200.100:4000';

  /// 본인 확인(입장권)이 필요한지와, 필요할 때 이동할 인증 주소를 읽는다.
  Future<TicketConfig> fetchConfig() async {
    final response = await http.get(Uri.parse('$_baseUrl/token/config'));
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return TicketConfig(
      required: json['ticketRequired'] == true,
      authUrl: json['authUrl'] as String? ?? '',
    );
  }

  Future<TokenResponse> fetchToken({
    required String orderId,
    String? ticket,
    String? roomName,
    String? participantName,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/token'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'orderId': orderId,
        'ticket': ticket,
        'roomName': roomName,
        'participantName': participantName,
      }),
    );

    if (response.statusCode == 201) {
      return TokenResponse.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>,
      );
    }
    // 토큰 서버가 알려준 사유(error)에 맞는 안내 문구로 바꾼다
    String? reason;
    String? authUrl;
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      reason = body['error'] as String?;
      authUrl = body['authUrl'] as String?;
    } catch (_) {}
    if (reason == 'ticket_invalid' && authUrl != null) {
      throw TicketRequiredException(authUrl);
    }
    final message = _refusalMessages[reason];
    if (message != null) {
      throw TokenRefusedException(message);
    }
    throw Exception(
      'Failed to fetch token: ${response.statusCode} ${response.body}',
    );
  }
}

class TicketConfig {
  const TicketConfig({required this.required, required this.authUrl});

  final bool required;

  /// 뒤에 `/<주문번호>`를 붙여 이동하는 본인 확인 주소
  final String authUrl;
}

/// 입장권이 없거나 만료됐을 때. [authUrl]로 이동해 본인 확인을 다시 받아야 한다.
class TicketRequiredException implements Exception {
  const TicketRequiredException(this.authUrl);

  final String authUrl;
}

const _refusalMessages = {
  'busy': '지금은 모든 상담원이 통화 중입니다. 잠시 후 다시 시도해 주세요.',
  'order_not_found': '주문번호를 확인할 수 없습니다. 상담 링크를 다시 확인해 주세요.',
  'verify_unavailable': '주문 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
  'too_many_attempts': '잠시 후 다시 시도해 주세요.',
  'order_id_required': '주문 안내에 있는 상담 링크로 접속해 주세요.',
};

/// 토큰 서버가 상담 시작을 거절했을 때. [message]는 고객에게 그대로 보여 준다.
class TokenRefusedException implements Exception {
  const TokenRefusedException(this.message);

  final String message;

  @override
  String toString() => message;
}
