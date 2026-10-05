# esim-api-server 개발 요청: 본인 확인을 마친 고객만 AI 상담에 들어오게 하기

지금은 `https://cs.esimbongsa.com/{주문번호}`가 주문번호만 맞으면 열린다.
전화번호 뒷자리 인증을 통과한 고객만 상담을 시작할 수 있도록, esim-api-server가 **서명된 입장권**을 발급하고
상담 서버가 그 서명을 확인한다.

## 전체 흐름

| 고객이 들어온 방식 | 일어나는 일 |
|---|---|
| 주문 내역 페이지의 AI 상담 버튼 | `/orders/cs/{주문번호}` → (인증 쿠키 있음) → 입장권이 붙은 상담 화면 |
| `cs.esimbongsa.com/{주문번호}` 직접 접속 | 상담 화면이 `my.esimbongsa.com/orders/cs/{주문번호}`로 이동 → (쿠키 없음) → 인증 페이지 → 인증 성공 → `/orders/cs/{주문번호}` → 입장권이 붙은 상담 화면 |
| 입장권이 만료된 뒤 상담 시작 | 위와 같이 `/orders/cs/{주문번호}`로 이동. 쿠키가 살아 있으면 새 입장권으로 바로 돌아온다 |

상담 서버 쪽(입장권 확인, 입장권이 없을 때 `/orders/cs/{주문번호}`로 이동)은 이미 구현·배포돼 있고 스위치만 꺼져 있다.

## 1. 입장권 발급 경로 (신규)

```
GET /orders/cs/:orderid
```

`src/inventry/order.controller.ts`에 추가한다. (`orders/(.*)`는 이미 전역 프리픽스 제외 대상이라 경로는 `/orders/cs/...` 그대로.)

- 기존 `getVerifiedOrderId(req)`로 쿠키(`esim_token`)를 확인한다.
- **쿠키의 주문번호가 `:orderid`와 같으면** → 입장권을 만들어 302:
  `https://cs.esimbongsa.com/{orderid}?t={입장권}`
- **아니면** → 302: `/orders/verify/{orderid}?next=cs`

상담 화면 주소는 환경변수 `CS_BASE_URL`(기본값 `https://cs.esimbongsa.com`)로 둔다.

## 2. 입장권 형식

JWT, HS256. 이미 주입돼 있는 `JwtService`를 쓴다.

```ts
this.jwtService.sign(
  { orderid },
  { secret: <CS_API_KEY>, expiresIn: '10m', audience: 'cs' },
);
```

| 항목 | 값 |
|---|---|
| 알고리즘 | HS256 |
| 서명 키 | 환경변수 `CS_API_KEY` (이미 `.env`에 있음. `JWT_SECRET`이 아니다) |
| payload `orderid` | 주문번호 (상담 서버가 주소의 주문번호와 같은지 확인) |
| payload `aud` | `"cs"` (문자열 하나) |
| payload `exp` | 발급 후 10분 |

`CS_API_KEY`가 비어 있으면 입장권을 발급하지 말고 500으로 응답한다(서명 없는 입장권이 나가면 안 된다).

상담 서버는 서명, `aud`, `exp`, `orderid` 일치를 모두 확인하며 하나라도 다르면 거절하고 고객을 다시 `/orders/cs/{orderid}`로 보낸다.

## 3. 인증 페이지: 인증 후 상담으로 돌려보내기

`src/inventry/templates/verify.template.ts`

- 지금은 인증 성공 시와 이미 인증된 경우에 `window.location.href = '/orders/list/' + ORDER_ID`로 이동한다(2곳).
- 주소에 `?next=cs`가 있으면 그 대신 `'/orders/cs/' + ORDER_ID`로 이동하게 한다.
- `next` 값은 **정확히 `cs`일 때만** 처리한다. 임의의 주소로 보내는 용도로 쓰이면 안 된다(오픈 리다이렉트 방지).
- `POST /orders/verify/:orderid`(핀 확인, 쿠키 발급)는 바꾸지 않는다.

## 4. 주문 내역 페이지의 AI 상담 버튼

`src/inventry/templates/order.template.ts`

- 지금: `href="https://cs.esimbongsa.com/${orderid}"`
- 변경: `href="/orders/cs/${orderid}"` (`target="_blank" rel="noopener"` 유지)

버튼을 누르는 시점에 입장권이 새로 발급되므로, 페이지를 오래 열어 둔 뒤 눌러도 만료 문제가 없다.

## 5. 기존 확인 API

`GET /api/v1/cs/orders/:orderid/verify`는 그대로 둔다. 입장권 방식이 켜지면 상담 서버는 이 API를 호출하지 않지만,
스위치를 껐을 때의 대체 경로로 남겨 둔다.

## 6. 확인 방법 (배포 후)

1. 인증하지 않은 브라우저에서 `https://my.esimbongsa.com/orders/cs/<실제 주문번호>` → 인증 페이지(`/orders/verify/...?next=cs`)로 이동하는지.
2. 전화번호 뒷자리 입력 → `https://cs.esimbongsa.com/<주문번호>?t=...`로 돌아오는지.
3. 주문 내역 페이지의 AI 상담 버튼 → 같은 형태의 주소가 새 탭으로 열리는지.
4. 다른 주문번호로 `/orders/cs/<남의 주문번호>` → 입장권이 나오지 않고 그 주문의 인증 페이지로 가는지.

배포가 끝나면 상담 서버 쪽에서 `~/apps/cs-token/.env`의 `ESIM_TICKET_REQUIRED=true`로 바꾸고
`pm2 restart cs-token --update-env`를 실행하면 입장권 검사가 켜진다.
