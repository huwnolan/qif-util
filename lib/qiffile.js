var fs = require("fs");
var QIFTran = require('./qiftran.js');

function QIFFile( filename ) {
  this.filename = filename;
  this.filetype = '';
  this.trans = [];
  this.recs = [];
  this.types = [];
  this.counts = {};
}

QIFFile.prototype = {

  readQIF: function () {
  
    var i, j, o = {}, qt='', qv='', split_no=0;
    var txn = new QIFTran();
    var me = this;
  
    // Get an array of lines in the QIF file
    var ql = fs.readFileSync(this.filename, { encoding: 'utf8' }).split(/\r?\n/);
    
    console.log("File name: " + this.filename);
    
    // Check QIF file type
    if ( ql[0].slice(0,6) != '!Type:' ) {
      console.error("Invalid QIF file type: " + ql[0]);
      return null;
    }
    
    this.filetype = ql[0].slice(6);
    console.log("File type: " + this.filetype);
    console.log("File lines: " + ql.length);
  
    var isInvest = ( this.filetype == 'Invest' );
    
    // Collect the QIF lines into records
    for ( i=1; i<ql.length; i++ ) {
      
      // Get the type and value of this QIF line
      qt = ql[i].slice(0,1).toUpperCase();
      qv = ql[i].slice(1);
      
      switch (qt) {
        
        case '^': 
          // At the end of a record, store it and initialise a new object
          this.trans.push(txn);
          this.recs.push(o);
          o = {}; split_no = 0;
          txn = new QIFTran();
          break;
          
        case 'D':
          // Handle Date field
          txn.date = this.getDate(qv);
          saveit();
          break;
        
        case 'T':
          // Handle Amount field
          txn.amount = this.getNumber(qv);
          saveit();
          break;
        
        case 'M':
          // Handle Memo field
          txn.memo = qv;
          saveit();
          break;
        
        case 'C':
          // Handle Cleared field
          txn.cleared = qv;
          saveit();
          break;
        
        case 'N':
          // Handle Cheque Number/Investment Action field
          if ( isInvest ) {
            txn.action = qv;
          } else {
            txn.cheque_number = qv;
          }
          saveit();
          break;
        
        case 'P':
          // Handle Payee field
          txn.payee = qv;
          saveit();
          break;
        
        case 'A':
          // Handle Address field(s)
          txn.address.push(qv);
          saveit();
          break;
        
        case 'L':
          // Handle Category field
          txn.category = this.getCategory(qv);
          saveit();
          break;
        
        // Codes used in Splits 
        case 'S':
          // Handle Category(split) field
          if ( isInvest ) {
            console.error("Split (S:Category) not allowed in Invest file, at line " + (i+1));
          } else {
            txn.addSplit();
            txn.getCurrentSplit().category = this.getCategory(qv);
          }
          split_no += 1;
          saveit(split_no);
          break;
        
        case 'E':
          // Handle Memo(split) field
          if ( isInvest ) {
            console.error("Split (E:Memo) not allowed in Invest file, at line " + (i+1));
          } else {
            txn.getCurrentSplit().memo = qv;
          }
          saveit(split_no);
          break;
        
        case '$':
          // Handle Amount(split)/Amount(invest) field
          if ( isInvest ) {
            txn.transfer_amount = this.getNumber(qv);
          } else {
            txn.getCurrentSplit().amount = this.getNumber(qv);
          }
          saveit(split_no);
          break;
        
        case '%':
          // Handle Allocation(split) field
          if ( isInvest ) {
            console.error("Split (%:Allocation) not allowed in Invest file, at line " + (i+1));
          } else {
            txn.getCurrentSplit().allocation = this.getNumber(qv);
          }
          saveit(split_no);
          break;
        
        // Codes used in Investments
        case 'Y':
          // Handle Security Name field
          if ( isInvest ) {
            txn.security_name = qv;
          } else {
            console.error("Invest code (Y:Security Name) not allowed in non-Invest file, at line " + (i+1));
          }
          saveit();
          break;
        
        case 'I':
          // Handle Price field
          if ( isInvest ) {
            txn.price = this.getNumber(qv);
          } else {
            console.error("Invest code (I:Price) not allowed in non-Invest file, at line " + (i+1));
          }
          saveit();
          break;
        
        case 'Q':
          // Handle Quantity field
          if ( isInvest ) {
            txn.quantity = this.getNumber(qv);
          } else {
            console.error("Invest code (Q:Quantity) not allowed in non-Invest file, at line " + (i+1));
          }
          saveit();
          break;
        
        case 'O':
          // Handle Commission field
          if ( isInvest ) {
            txn.commission = this.getNumber(qv);
          } else {
            console.error("Invest code (O:Commission) not allowed in non-Invest file, at line " + (i+1));
          }
          saveit();
          break;
        
        case '':
          // Ignore blank lines
          break;
        
        default:
          throw new Error('Unknown Detail Code: [' + qt + ']'); 
          
      }
        
    }
    
    function saveit (sn) {
      
      var qc = qt;
      if (sn) { qc += '' + sn; }
  
      // Collect QIF types and counts
      if ( qc in me.counts ) {
        me.counts[qc] += 1;
      } else {
        me.types.push(qc);
        me.counts[qc] = 1;
      }
      
      // Save the value of this QIF type
      o[qc] = ql[i].slice(1);
      
    }
    
    console.log("Found " + this.recs.length + " QIF records\n");
    return true;
  
  },
  
  getDate: function (txt) {
    return txt;
  },
  
  getNumber: function (txt) {
    return txt;
  },
  
  getCategory: function (txt) {
    return txt;
  },
  
  dumpTran: function () {
    for ( var i=0; i<this.trans.length; i++ ) {
      console.log(this.trans[i]);
    }
  },
  
  writeTSV: function () {
  
    console.log(this.types.join("\t"));
    var tsv = [];
    
    for ( i=0; i<this.recs.length; i++ ) {
      tsv=[];
      for ( j=0; j<this.types.length; j++ ) {
        tsv.push(this.recs[i][this.types[j]]); 
      }
      console.log(tsv.join("\t"));
    }
  
  }

};

module.exports = QIFFile;
