# Ghi chú nghiên cứu: tích hợp email an toàn

## Các khả năng đã xác minh

- Gmail API hỗ trợ xác thực OAuth 2.0 và cơ chế theo dõi hộp thư qua Cloud Pub/Sub thay vì quét liên tục.
- Microsoft Graph hỗ trợ đăng ký thay đổi thư Outlook/Microsoft 365 và gửi thông báo HTTP POST tới endpoint của ứng dụng.
- Gmail và Microsoft 365 đều hỗ trợ OAuth 2.0 cho IMAP; do đó không cần yêu cầu người dùng nhập mật khẩu hộp thư vào TaskFlow.

## Nguồn chính thức

1. Google for Developers, [Gmail API push notifications](https://developers.google.com/workspace/gmail/api/guides/push).
2. Microsoft Learn, [Receive change notifications through webhooks](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks).
3. Microsoft Learn, [Authenticate IMAP, POP or SMTP using OAuth](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth).
4. Google for Developers, [OAuth 2.0 mechanism for Gmail IMAP](https://developers.google.com/workspace/gmail/imap/xoauth2-protocol).
