docker rm -f assdle
docker run --rm -d --name assdle -p 8080:80 -v $(pwd)/src:/usr/share/nginx/html:ro nginx