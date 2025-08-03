cp .env.production.local .env &&
scp  ./.env karthik@$1:/home/karthik/vislogssp_node/ &&
ssh karthik@$1 'cd /home/karthik/vislogssp_node && git fetch --all && git reset --hard origin/main' &&
cp ./configs/auth_configs.production.json ./configs/auth_configs.json &&
scp ./configs/auth_configs.json karthik@$1:/home/karthik/vislogssp_node/configs/ &&
ssh karthik@$1 '. /home/karthik/.nvm/nvm.sh;cd /home/karthik/vislogssp_node/;npm run build; pm2 restart vislogssp_node; pm2 save' 
