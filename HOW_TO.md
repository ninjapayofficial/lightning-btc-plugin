curl -X POST http://localhost:3000/plugins/lightning-btc-plugin/create-invoice \
  -H "Content-Type: application/json" \
  -H "x-provider-invoice-key: p_ik_tre2qkb7l" \
  -d '{"amount": 1000, "memo": "Test Payment"}'



curl -X POST http://localhost:3000/plugins/lightning-btc-plugin/pay-invoice \
  -H "Content-Type: application/json" \
  -H "x-provider-admin-key: p_ak_kcq5mtsp4" \
  -d '{"bolt11": "lnbc1..."}'


curl -X GET http://localhost:3000/plugins/lightning-btc-plugin/balance \
  -H "x-provider-invoice-key: p_ik_tre2qkb7l"

  curl -X GET http://localhost:3000/plugins/lightning-btc-plugin/transactions \
  -H "x-provider-invoice-key: p_ik_tre2qkb7l"



  \\\ \

  \
  npm init -y
  \
  npm install --save-dev webpack webpack-cli babel-loader @babel/core @babel/preset-env

  \
  npm install axios sequelize

  \
  touch .babelrc

  \

  touch webpack.config.js

  \

  npm install axios sequelize

