// src/index.js
const axios = require('axios');
const path = require('path');

module.exports = {
  init: async function (app, sequelize, invoiceKey) {
    // Determine the plugin name from the directory name
    const pluginPath = __dirname;
    const pluginName = path.basename(pluginPath);

    console.log(`Initializing plugin '${pluginName}' with Invoice Key: ${invoiceKey}`);

    // Define a Sequelize model for transaction history
    const { DataTypes } = require('sequelize');

    const Transaction = sequelize.define(`${pluginName}_Transaction`, {
      txid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
      },
      invoiceKeyUsed: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Sync the model with the database
    try {
      await Transaction.sync();
      console.log(`Transaction model for plugin '${pluginName}' synced with the database`);
    } catch (err) {
      console.error(`Error syncing Transaction model for plugin '${pluginName}':`, err);
    }

    // Create a router for the plugin
    const express = require('express');
    const router = express.Router();

    // Register routes after syncing
    // Route to serve the plugin's interface (index.html)
    router.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'views', 'index.html'));
      });
    // Route to create an invoice
    router.post('/create-invoice', async (req, res) => {
      try {
        const { amount, memo } = req.body;

        const response = await axios.post(
          'https://demo.lnbits.com/api/v1/payments',
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
        console.error('Error creating invoice:', error.response ? error.response.data : error.message);
        res.status(500).send('Error creating invoice.');
      }
    });

    // Route to pay an invoice
    router.post('/pay-invoice', async (req, res) => {
      try {
        const { bolt11 } = req.body;

        const response = await axios.post(
          'https://demo.lnbits.com/api/v1/payments',
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
        console.error('Error paying invoice:', error.response ? error.response.data : error.message);
        res.status(500).send('Error paying invoice.');
      }
    });

    // Route to get transaction history
    router.get('/transactions', async (req, res) => {
      try {
        const transactions = await Transaction.findAll();
        res.json(transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Error fetching transactions.');
      }
    });

    // Route to get wallet balance
    router.get('/balance', async (req, res) => {
      try {
        const response = await axios.get('https://demo.lnbits.com/api/v1/wallet', {
          headers: {
            'X-Api-Key': invoiceKey,
            'Content-Type': 'application/json',
          },
        });

        const { balance } = response.data;

        res.json({ balance });
      } catch (error) {
        console.error('Error fetching balance:', error.response ? error.response.data : error.message);
        res.status(500).send('Error fetching balance.');
      }
    });

    // Mount the router under '/plugin-name'
    app.use(`/${pluginName}`, router);
  },
};
