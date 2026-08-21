# Căn cứ thiết kế lịch âm và ngày lễ Việt Nam

## Lịch âm

TaskFlow sẽ dùng thư viện TypeScript `@dqcai/vn-lunar` để chuyển đổi dương lịch sang âm lịch cục bộ trong trình duyệt. Tài liệu thư viện công bố hỗ trợ chuyển đổi âm/dương, tháng nhuận, TypeScript và trình duyệt; API `getLunarDate(day, month, year)` phù hợp để hiển thị ngày âm phụ dưới ngày dương mà không cần gọi dịch vụ bên ngoài.[1]

## Phạm vi ngày lễ

Giao diện sẽ đánh dấu các ngày lễ có ngày cố định hoặc quy đổi được từ âm lịch: Tết Dương lịch, Tết Nguyên Đán, Giỗ Tổ Hùng Vương, Ngày Giải phóng miền Nam, Quốc tế Lao động và Quốc khánh. Lịch nghỉ thực tế, ngày hoán đổi/nghỉ bù và số ngày nghỉ Tết thay đổi theo quyết định từng năm; vì vậy phiên bản đầu chỉ gắn nhãn **ngày lễ**, không khẳng định đó là lịch nghỉ làm việc của một tổ chức.[2]

| Loại ngày | Quy tắc hiển thị |
| --- | --- |
| Dương lịch cố định | 01/01, 30/04, 01/05, 02/09 |
| Âm lịch quy đổi | Mùng 1 Tết, 10/03 âm lịch (Giỗ Tổ Hùng Vương) |
| Không tự suy diễn | Nghỉ bù, ngày làm bù, thời gian nghỉ Tết do cơ quan có thẩm quyền công bố hằng năm |

## Tham chiếu

[1] [@dqcai/vn-lunar – NPM](https://www.npmjs.com/package/@dqcai/vn-lunar)

[2] [Bộ luật Lao động 2019 – Điều 112 (tham khảo tổng hợp)](https://english.luatvietnam.vn/legal-news/public-holiday-leaves-of-foreign-employees-in-vietnam-4729-91710-article.html)
