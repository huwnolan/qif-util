var fs = require("fs");

function QIFTran() {
}

QIFTran.prototype = {

  readQIF: function () {
  },
  
  addSplit: function () {
    if (!this.splits) { this.splits = []; }
    var split = {};
    this.splits.push(split);
    return split;
  },
  
  getCurrentSplit: function () {
    return this.splits[this.splits.length - 1];
  }
  
};

module.exports = QIFTran;

//  this.filetype = '';
//
//  // Common fields
//  this.date = '';
//  this.payee = ''
//  this.category = '';    // Can also appear in split
//  this.subcategory = ''; // Can also appear in split
//  this.classname = '';   // Can also appear in split
//  this.memo = '';        // Can also appear in split
//  this.amount = 0;       // Can also appear in split
//  this.cleared = '';
//
//  // Additional fields
//  this.number = '';
//  this.address = [];
//
//  // Investment fields
//  this.action = '';
//  this.security = '';
//  this.price = 0;
//  this.quantity = 0;
//  this.commission = '';
//  this.transfer = 0;
//
//  this.splits = [];

