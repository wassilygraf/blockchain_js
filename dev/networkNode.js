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
    transactions: bitcoin.pendingTransactions,
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
  const lastBlock = bitcoin.getLastBlock();

  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock.index + 1 === newBlock.index;

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

// get consensus
app.get('/consensus', async (req, res) => {

  // get all request promises for each network node 
  const reqPromises = bitcoin.networkNodes.map(nodeUrl => rp({
    uri: `${nodeUrl}/blockchain`,
    method: 'GET',
    json: true,
  }))
  // execute requests and get all blockchains
  const blockchains = await Promise.all(reqPromises);

  const initialNodeChainLength = bitcoin.chain.length;
  blockchains.forEach(blockchain => {
    if (blockchain.chain.length > bitcoin.chain.length && bitcoin.chainIsValid(blockchain.chain)) {
      bitcoin.chain = blockchain.chain;
      bitcoin.pendingTransactions = blockchain.pendingTransactions;
    }
  });

  let note = initialNodeChainLength < bitcoin.chain.length 
    ? 'this chain has been replaced'
    : 'current chain has not been replaced';

  res.json({
    note, 
    chain: bitcoin.chain,
  }); 
})

// get specific block
app.get('/block/:blockHash', (req, res) => {
  const { blockHash } = req.params;
  const block = bitcoin.getBlock(blockHash);
  res.json({ block });
})

// get specific transaction
app.get('/transaction/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  const { transaction, block } = bitcoin.getTransaction(transactionId);
  res.json({ transaction, block });
})

// get specific address
app.get('/address/:address', (req, res) => {
  const { address } = req.params;
  const { 
    allTransactions: transactions, 
    balance,
  } = bitcoin.getAddressData(address);
  res.json({ transactions, balance });
})

app.listen(PORT, () => console.log(`listening on port ${PORT}...`));