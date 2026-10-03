import 'dart:convert';
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
  static const String _baseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: 'http://192.168.200.100:4000');

  Future<TokenResponse> fetchToken({
    String? roomName,
    String? participantName,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/token'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'roomName': roomName,
        'participantName': participantName,
      }),
    );

    if (response.statusCode == 201) {
      return TokenResponse.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>,
      );
    }
    throw Exception('Failed to fetch token: ${response.statusCode} ${response.body}');
  }
}
