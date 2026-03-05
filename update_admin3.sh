#!/bin/bash
mysql -u gobiz -pG0b1z_S3cur3_2024! gobiz_gateway -e "UPDATE users SET role = 'ADMIN' WHERE email = 'odzreshop@gmail.com';"
mysql -u gobiz -pG0b1z_S3cur3_2024! gobiz_gateway -e "SELECT id, username, email, role FROM users WHERE email = 'odzreshop@gmail.com';"
