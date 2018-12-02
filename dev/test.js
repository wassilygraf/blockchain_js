const BlockChain = require('./blockchain');

const bitcoin = new BlockChain();

const bc1 = {
  "chain": [
    {
      "index": 1,
      "timeStamp": 1543753950745,
      "transactions": [],
      "nonce": 100,
      "hash": "0",
      "previousBlockHash": "0"
    },
    {
      "index": 2,
      "timeStamp": 1543753957280,
      "transactions": [],
      "nonce": 192133,
      "hash": "000073e7d35d35be0861f043cae54db47715fe0d145fd49bd5964140949f2a31",
      "previousBlockHash": "0"
    },
    {
      "index": 3,
      "timeStamp": 1543753969297,
      "transactions": [
        {
          "amount": 12.5,
          "sender": "00",
          "recipient": "560d2270f62e11e89661bdefef728055",
          "transactionId": "59f66a90f62e11e89661bdefef728055"
        },
        {
          "amount": 90,
          "sender": "999",
          "transactionId": "5e9c9a10f62e11e89661bdefef728055"
        },
        {
          "amount": 90,
          "sender": "999",
          "transactionId": "5f979be0f62e11e89661bdefef728055"
        },
        {
          "amount": 90,
          "sender": "999",
          "transactionId": "5ffd3b80f62e11e89661bdefef728055"
        }
      ],
      "nonce": 802,
      "hash": "00000c540cbd3a84af94eea25a43c974603bfbc2ed20c85d0d284ded4d2fe3ef",
      "previousBlockHash": "000073e7d35d35be0861f043cae54db47715fe0d145fd49bd5964140949f2a31"
    },
    {
      "index": 4,
      "timeStamp": 1543753976293,
      "transactions": [
        {
          "amount": 12.5,
          "sender": "00",
          "recipient": "560d2270f62e11e89661bdefef728055",
          "transactionId": "611cdc50f62e11e89661bdefef728055"
        },
        {
          "amount": 90,
          "sender": "999",
          "transactionId": "62d47760f62e11e89661bdefef728055"
        }
      ],
      "nonce": 97562,
      "hash": "0000b3257952a585165a1a402817825bdaa7ef30ec8187162d66ba791a497a46",
      "previousBlockHash": "00000c540cbd3a84af94eea25a43c974603bfbc2ed20c85d0d284ded4d2fe3ef"
    },
    {
      "index": 5,
      "timeStamp": 1543753977737,
      "transactions": [
        {
          "amount": 12.5,
          "sender": "00",
          "recipient": "560d2270f62e11e89661bdefef728055",
          "transactionId": "65480f70f62e11e89661bdefef728055"
        }
      ],
      "nonce": 54032,
      "hash": "000027b54ec503c7e096ace6bcf629f32c0aca0842a86db16544c33db3d8e08e",
      "previousBlockHash": "0000b3257952a585165a1a402817825bdaa7ef30ec8187162d66ba791a497a46"
    }
  ],
  "pendingTransactions": [
    {
      "amount": 12.5,
      "sender": "00",
      "recipient": "560d2270f62e11e89661bdefef728055",
      "transactionId": "66248cc0f62e11e89661bdefef728055"
    }
  ],
  "currentNodeUrl": "http://localhost:3001",
  "networkNodes": []
}

const ind2 = bc1.chain[1];
const { index, transactions, previousBlockHash } = ind2;
const blockData = { transactions, index };
const nonce = bitcoin.proofOfWork(previousBlockHash, blockData);
const hash = bitcoin.hashBlock(previousBlockHash, blockData, nonce);

const validChain = bitcoin.chainIsValid(bc1.chain);
console.log(validChain);