# esim-api-server 개발 요청: 상담용 주문 확인 API와 AI 상담 버튼

AI 음성 상담(`https://cs.esimbongsa.com/{주문번호}`)이 실제 주문이 있는 고객에게만 열리도록,
상담 서버가 esim-api-server에 주문번호의 존재 여부를 물어볼 수 있게 한다.
상담 서버(토큰 서버)는 같은 VPS에서 `http://127.0.0.1:3000`으로 호출한다.

## 1. 주문 확인 API

```
GET /api/v1/cs/orders/:orderid/verify
Header: x-cs-api-key: <환경변수 CS_API_KEY 값>
```

| 상황 | 응답 |
|---|---|
| 주문 있음 | 200 `{ "success": true, "data": { "exists": true }, "message": "OK" }` |
| 주문 없음 | 200 `{ "success": true, "data": { "exists": false }, "message": "OK" }` |
| 헤더 없음·값 불일치, 또는 서버에 `CS_API_KEY` 미설정 | 401 |

주문이 없을 때도 404가 아니라 200에 `exists: false`로 답한다. 상담 서버가 "주문 없음"과 "서버 오류"를 구분해야 하기 때문이다.

### 구현 안내

- **조회**: `src/inventry/inventry.service.ts`에 `orderExists(orderid: string): Promise<boolean>` 추가.
  `this.processedOrderRepo.count({ where: { orderid } }) > 0`. 기존 `verifyPin`, `renderVerifyHtml`과 같은 테이블(`orders`)·같은 조건이다.
- **컨트롤러**: `src/inventry/cs.controller.ts` 신규. `@Controller('cs/orders')`, `@Get(':orderid/verify')`,
  반환값은 `{ exists }`. 응답 포장은 전역 `ResponseInterceptor`가 한다.
  `InventryModule`의 `controllers`에 등록한다.
- **경로**: `main.ts`의 전역 프리픽스 제외 목록(`orders/(.*)` 등)에는 추가하지 않는다. 그래야 경로가 `/api/v1/cs/...`가 된다.
- **가드**: `src/common/guards/cs-api-key.guard.ts` 신규. 요청 헤더 `x-cs-api-key`를 `ConfigService`의 `CS_API_KEY`와
  `crypto.timingSafeEqual`로 비교한다(길이가 다르면 바로 거절). `CS_API_KEY`가 비어 있으면 항상 401.
- **요청 제한 제외**: 이 컨트롤러에 `@SkipThrottle()`. 호출이 모두 토큰 서버(127.0.0.1) 한 곳에서 오므로
  전역 분당 100회 한도를 한 IP가 다 쓰게 된다. 주문번호 대입 방지는 상담 서버가 접속 IP별로 한다.
- **응답 내용**: 존재 여부만. 주문자 이름·전화번호 등 주문 내용은 넣지 않는다.

### 환경변수

VPS의 `~/apps/esim/.env`에 한 줄 추가:

```
CS_API_KEY=<값>
```

값은 VPS의 `~/apps/cs-token/.env`에 있는 `ESIM_CS_API_KEY`(현재 `#`으로 주석 처리된 줄)와 같아야 한다.
그 파일에서 복사해 넣는다. 저장소에는 커밋하지 않는다.

## 2. 주문 내역 페이지에 AI 상담 버튼

- 파일: `src/inventry/templates/order.template.ts`
- 위치: 하단 문의 버튼 영역. 카카오톡(`support__btn--kakao`), 네이버 톡톡(`support__btn--naver`),
  전화(`support__btn--call`) 버튼이 있는 곳에 하나 추가한다.
- 링크: `https://cs.esimbongsa.com/${orderid}` (새 탭, `rel="noopener"`).
  `orderid`는 `buildOrderHtml({ orderid, orderDate, items })`에 이미 전달되는 값이다.
- 문구 예: "AI 음성 상담". 기존 버튼과 같은 스타일 계열로.

이 페이지는 전화번호 뒷자리 확인을 통과한 고객만 볼 수 있어 상담 진입 경로로 적합하다.

## 3. 확인 방법 (배포 후 VPS에서)

```
# 있는 주문번호 → exists: true
curl -s -H "x-cs-api-key: $KEY" http://127.0.0.1:3000/api/v1/cs/orders/<실제 주문번호>/verify
# 없는 주문번호 → exists: false
curl -s -H "x-cs-api-key: $KEY" http://127.0.0.1:3000/api/v1/cs/orders/0000000000000000/verify
# 키 없이 → 401
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/v1/cs/orders/0000000000000000/verify
```

배포가 끝나면 상담 서버 쪽에서 `~/apps/cs-token/.env`의 `ESIM_CS_API_KEY` 주석을 풀고
`pm2 restart cs-token --update-env`를 실행하면 검증이 켜진다.
