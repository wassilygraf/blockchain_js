const BlockChain = require('./blockchain');

const bitcoin = new BlockChain();

const previousBlockHash = 'askjdfgq23r';
const currentBlockData = [
  {
    amount: 12, 
    sender: 'aydlfkhasd',
    recipient: 'asdfkjaghsd',
  },
  {
    amount: 50, 
    sender: 'asddhjhi',
    recipient: 'kljhkjhgoe',
  },
  {
    amount: 44, 
    sender: 'zxcvcvzxc',
    recipient: 'oiygaiyoie',
  },
];

const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
const correctHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, 93536);

console.log(nonce);
console.log(correctHash);