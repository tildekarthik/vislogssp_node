cp .env.production .env &&
scp  ./.env ec2-user@$1:/home/ec2-user/vislogssp_node/ &&
ssh ec2-user@$1 'cd /home/ec2-user/vislogssp_node && git fetch --all && git reset --hard origin/main' &&
cp ./configs/auth_configs.production.json ./configs/auth_configs.json &&
scp ./configs/auth_configs.json ec2-user@$1:/home/ec2-user/vislogssp_node/configs/ &&
ssh ec2-user@$1 '. /home/ec2-user/.nvm/nvm.sh;cd /home/ec2-user/vislogssp_node/;npm run build; pm2 restart vislogssp_node; pm2 save' 
