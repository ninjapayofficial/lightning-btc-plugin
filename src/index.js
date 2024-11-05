// src/index.js
const axios = require('axios');

module.exports = {
  init: function (app, sequelize, invoiceKey) {
    console.log('Lightning BTC Plugin initialized with Invoice Key:', invoiceKey);

    // Define a Sequelize model for transaction history
    const { DataTypes } = require('sequelize');

    const Transaction = sequelize.define('Transaction', {
      txid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
      },
      invoiceKeyUsed: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    });

    // Sync the model with the database
    Transaction.sync()
      .then(() => {
        console.log('Transaction model synced with the database');
      })
      .catch((err) => {
        console.error('Error syncing Transaction model:', err);
      });

    // Route to create an invoice
    app.post('/lightning-btc/create-invoice', async (req, res) => {
      try {
        const { amount, memo } = req.body;

        const response = await axios.post(
          'https://legend.lnbits.com/api/v1/payments', 
          {
            out: false,
            amount,
            memo,
          },
          {
            headers: {
              'X-Api-Key': invoiceKey,
              'Content-Type': 'application/json',
            },
          }
        );

        const { payment_request, payment_hash } = response.data;

        // Store the transaction in the database
        await Transaction.create({
          txid: payment_hash,
          amount,
          description: memo,
          invoiceKeyUsed: invoiceKey,
        });

        res.json({
          payment_request,
          payment_hash,
        });
      } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).send('Error creating invoice.');
      }
    });

    // Route to pay an invoice
    app.post('/lightning-btc/pay-invoice', async (req, res) => {
      try {
        const { bolt11 } = req.body;

        const response = await axios.post(
          'https://legend.lnbits.com/api/v1/payments',
          {
            out: true,
            bolt11,
          },
          {
            headers: {
              'X-Api-Key': invoiceKey,
              'Content-Type': 'application/json',
            },
          }
        );

        const { payment_hash } = response.data;

        // Store the transaction in the database
        await Transaction.create({
          txid: payment_hash,
          amount: null, // Amount could be fetched from the invoice details
          description: 'Payment made',
          invoiceKeyUsed: invoiceKey,
        });

        res.json({
          payment_hash,
        });
      } catch (error) {
        console.error('Error paying invoice:', error);
        res.status(500).send('Error paying invoice.');
      }
    });

    // Route to get transaction history
    app.get('/lightning-btc/transactions', async (req, res) => {
      try {
        const transactions = await Transaction.findAll();
        res.json(transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Error fetching transactions.');
      }
    });
  },
};
