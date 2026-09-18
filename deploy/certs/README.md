Place TLS files here for production nginx:

- fullchain.pem
- privkey.pem

Do not commit private keys. `docker-compose.prod.yml` mounts this directory at `/etc/nginx/certs`.
