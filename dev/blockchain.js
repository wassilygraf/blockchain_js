const sha256 = require('sha256');
const uuid = require('uuid/v1');
const currentNodeUrl = process.argv[3];

const BlockChain = function () {
  this.chain = [];
  this.pendingTransactions = [];

  this.currentNodeUrl = currentNodeUrl;
  this.networkNodes = [];

  this.createNewBlock(100, '0', '0');
};

BlockChain.prototype.createNewBlock = function (nonce, previousBlockHash, hash) {
  const newBlock = {
    index: this.chain.length + 1,
    timeStamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce,
    hash,
    previousBlockHash,
  };  

  this.pendingTransactions = [];
  this.chain.push(newBlock);

  return newBlock;
};

BlockChain.prototype.getLastBlock = function () {
  return this.chain[this.chain.length - 1];
};

BlockChain.prototype.createNewTransaction = function (amount, sender, recipient) {
  const transactionId =  uuid().split('-').join('');

  const newTransaction = {
    amount, sender, recipient, transactionId,
  };

  return newTransaction;
};

BlockChain.prototype.addTransactionToPendingTransactions = function (transaction) {
  this.pendingTransactions.push(transaction);
  return this.getLastBlock().index + 1;
}

BlockChain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
  const data = `${previousBlockHash}${JSON.stringify(currentBlockData)}${nonce}`;
  const hash = sha256(data);
  return hash;
}

BlockChain.prototype.proofOfWork = function (previousBlockHash, currentBlockData) {
  let nonce = 0;
  let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  while(hash.substring(0, 4) !== '0000') {
    nonce += 1;
    hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  }
  return nonce;
}

BlockChain.prototype.chainIsValid = function (blockchain) {
  const validChain = blockchain.every((block, chainIndex, chain) => {
    if(chainIndex) {
      const previousBlock = chain[chainIndex - 1];
      const hashesMatch = block.previousBlockHash === previousBlock.hash;

      const blockHash = this.hashBlock(previousBlock.hash, {
        transactions: block.transactions,
        index: block.index,
      }, block.nonce);

      const validHash = blockHash.substring(0,4) === '0000';
      return hashesMatch && validHash;
    }
    // return true by default for the first item in the chain
    return true;
  });

  const genesisBlock = blockchain[0];
  const validGenesis = genesisBlock.nonce === 100 
    && genesisBlock.previousBlockHash === '0' 
    && genesisBlock.hash === '0' 
    && !genesisBlock.transactions.length;

  return validChain && validGenesis;
}

BlockChain.prototype.getBlock = function (blockHash) {
  return this.chain.find(block => block.hash === blockHash);
}

BlockChain.prototype.getTransaction = function (transactionId) {
  // get the block that has a transaction with the correct transactionId
  return this.chain.reduce((acc, block) => {
    const transaction = block.transactions.find(
      transaction => transaction.transactionId === transactionId);

    if (transaction) {
      acc.transaction = transaction;
      acc.block = block;
    }

    return acc;
  }, {})
}

BlockChain.prototype.getAddressData = function (address) {
  const allTransactions = this.chain.reduce((acc, block) => {
    const transactions = block.transactions
      .filter(tx => tx.sender === address || tx.recipient === address);

    if (transactions) {
      acc.push(...transactions);
    }
    return acc;
  }, [])

  console.log(allTransactions);
  // get balance
  const balance = allTransactions.reduce((acc, tx) => {
    if(tx.recipient === address) {
      acc += tx.amount;
    } else {
      acc -= tx.amount;
    }
    return acc;
  }, 0);

  return {
    allTransactions,
    balance,
  }
}

module.exports = BlockChain;
