import 'package:flutter/material.dart';
import 'screens/call_screen.dart';

void main() {
  runApp(const SupportApp());
}

class SupportApp extends StatelessWidget {
  const SupportApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '이심봉사 · 고객 상담',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A3A8A)),
        useMaterial3: true,
      ),
      home: const CallScreen(),
    );
  }
}
