const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const uuid = require('uuid/v1');
const rp = require('request-promise');


const nodeAddress = uuid().split('-').join('');

const BlockChain = require('./blockchain');
const bitcoin = new BlockChain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const PORT = process.argv[2];

app.get('/blockchain', (req, res) => {
  res.send(bitcoin);
})

app.post('/transaction', (req, res) => {
  const { newTransaction } = req.body;
  const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
  res.json({ note: `transaction will be added in block ${blockIndex}.` });
})

app.post('/transaction/broadcast', async (req, res) => {
  const newTransaction = bitcoin.createNewTransaction(
    req.body.amount, req.body.sender, req.body.recipient);
  bitcoin.addTransactionToPendingTransactions(newTransaction);

  const transactionPromises = [];
  bitcoin.networkNodes.forEach(nodeUrl => {
    const options = {
      uri: `${nodeUrl}/transaction`,
      method: 'POST',
      body: { newTransaction },
      json: true,
    }
    transactionPromises.push(rp(options));
  })

  const response = await Promise.all(transactionPromises);
  res.json({ note: 'transaction created and broadcasted successfully' });
})

app.get('/mine', async (req, res) => {
  const lastBlock = bitcoin.getLastBlock();
  const previousBlockHash = lastBlock.hash
  const currentBlockData = {
    transactions: bitcoin.transactions,
    index: lastBlock.index + 1,
  }
  const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

  const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

  const minedBlockPromises = [];
  bitcoin.networkNodes.forEach(nodeUrl => {
    const options = {
      uri: `${nodeUrl}/receive-new-block`,
      method: 'POST',
      body: { newBlock }, 
      json: true,
    }
    minedBlockPromises.push(rp(options)); 
  })
  const response = await Promise.all(minedBlockPromises);

  // create mining award
  const miningAwardOptions = {
    uri: `${bitcoin.currentNodeUrl}/transaction/broadcast`,
    method: 'POST',
    body: {
      amount: 12.5,
      sender: '00',
      recipient: nodeAddress,
    },
    json: true,
  }
  const rewardResponse = await rp(miningAwardOptions);

  res.json({ note: 'new block mined successfully', block: newBlock });
});

app.post('/receive-new-block', (req, res) => {
  const { newBlock } = req.body;
  console.log(newBlock);
  const lastBlock = bitcoin.getLastBlock();

  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock.index + 1 === newBlock.index;
  console.log(correctHash, correctIndex);

  if(correctHash && correctIndex) {
    bitcoin.chain.push(newBlock);
    bitcoin.pendingTransactions = [];
    res.json({ note: 'new block received and accepted', newBlock });
  } else {
    res.json({ note: 'new block rejeccted', newBlock });
  }
})

// register a node and broadcast the node to the network
app.post('/register-and-braodcast-node', async (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  if(bitcoin.networkNodes.indexOf(newNodeUrl) === -1) {
    bitcoin.networkNodes.push(newNodeUrl);
  };

  const registerNodesPromises = [];
  bitcoin.networkNodes.forEach(nodeUrl => {
    const options = {
      uri: `${nodeUrl}/register-node`,
      method: 'POST',
      body: { newNodeUrl },
      json: true,
    }
    registerNodesPromises.push(rp(options));
  });
  
  try {
    const data = await Promise.all(registerNodesPromises);
    const bulkRegisterOptions = {
      uri: `${newNodeUrl}/register-nodes-bulk`,
      method: 'POST',
      body: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl] },
      json: true,
    }

    const bulkResponse = await rp(bulkRegisterOptions);
    res.json({ note: 'New Node registered with network successfully' });
  } catch(err) {
    throw new Error(err);
  }

})

// register node with network
app.post('/register-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  if(bitcoin.networkNodes.indexOf(newNodeUrl) === -1 && bitcoin.currentNodeUrl !== newNodeUrl) { 
    bitcoin.networkNodes.push(newNodeUrl);
  }
  res.json({ note: 'new node registered successfully' });
})

// register multiple nodes
app.post('/register-nodes-bulk', (req, res) => {
  const { allNetworkNodes } = req.body;
  allNetworkNodes.forEach(nodeUrl => {
    const notAlreadyPresent = bitcoin.networkNodes.indexOf(nodeUrl) === -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== nodeUrl
    if(notAlreadyPresent  && notCurrentNode) {
      bitcoin.networkNodes.push(nodeUrl);
    };
  });
  res.json({ note: 'bulk registration successful' });
})

app.listen(PORT, () => console.log(`listening on port ${PORT}...`));