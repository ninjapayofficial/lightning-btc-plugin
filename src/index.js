// src/index.js
const axios = require('axios');
const path = require('path');
const { DataTypes } = require('sequelize');
const express = require('express');

module.exports = {
  init: async function (router, sequelize) {
    // Determine the plugin name from the directory name
    const pluginPath = __dirname;
    const pluginName = path.basename(pluginPath);

    console.log(`Initializing plugin '${pluginName}'`);

    // Define a Sequelize model for transaction history
    const Transaction = sequelize.define(
      'lightning_btc_plugin_Transaction',
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        walletId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
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
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        freezeTableName: true, // Prevents Sequelize from pluralizing table name
      }
    );


    // Remove the sync call as migrations handle schema updates
    // await Transaction.sync();

    // Serve the plugin's interface (index.html)
    router.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'views', 'index.html'));
    });

    // Route to create an invoice
    router.post('/create-invoice', async (req, res) => {
      const { amount, memo } = req.body;
      const { uid: userId, walletId, invoiceKey } = req.user;

      if (!invoiceKey) {
        return res.status(400).send('Invoice key not found.');
      }

      try {
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
          userId,
          walletId,
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
        console.error(
          'Error creating invoice:',
          error.response ? error.response.data : error.message
        );
        res.status(500).send('Error creating invoice.');
      }
    });

    // Route to pay an invoice
    router.post('/pay-invoice', async (req, res) => {
      const { bolt11 } = req.body;
      const { uid: userId, walletId, invoiceKey } = req.user;

      if (!invoiceKey) {
        return res.status(400).send('Invoice key not found.');
      }

      try {
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
          userId,
          walletId,
          txid: payment_hash,
          amount: null, // Amount could be fetched from the invoice details
          description: 'Payment made',
          invoiceKeyUsed: invoiceKey,
        });

        res.json({
          payment_hash,
        });
      } catch (error) {
        console.error(
          'Error paying invoice:',
          error.response ? error.response.data : error.message
        );
        res.status(500).send('Error paying invoice.');
      }
    });

    // Route to get transaction history
    router.get('/transactions', async (req, res) => {
      const { uid: userId } = req.user;

      try {
        const transactions = await Transaction.findAll({
          where: { userId },
        });
        res.json(transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Error fetching transactions.');
      }
    });

    // Route to get wallet balance
    router.get('/balance', async (req, res) => {
      const { invoiceKey } = req.user;

      if (!invoiceKey) {
        return res.status(400).send('Invoice key not found.');
      }

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
        console.error(
          'Error fetching balance:',
          error.response ? error.response.data : error.message
        );
        res.status(500).send('Error fetching balance.');
      }
    });

    // No need to mount the router here; it's handled by the main application
  },
};
