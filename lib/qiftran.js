var fs = require("fs");

function QIFTran( filetype, lines, startline ) {
   
   this.errors = [];
   this.filetype = filetype;
   this.readLines( lines, startline );
   if ( this.errors.length > 0 ) {
      console.error(this.errors);
   }
   
}

QIFTran.prototype = {

   readLines: function ( lines, startline ) {
      
      var qifcode, qiftext, linenum;
      var isInvest = ( this.filetype == 'Invest' );

      for ( var i=0; i<lines.length; i++ ) {
         qifcode = lines[i][0];
         qiftext = lines[i][1];
         this.linenum = startline + i;

         switch (qifcode) {
           
           case 'D':
             // Handle Date field
             this.date = this.getDate(qiftext);
             break;
           
           case 'T':
             // Handle Amount field
             this.amount = this.getNumber(qiftext);
             break;
           
           case 'M':
             // Handle Memo field
             this.memo = qiftext;
             break;
           
           case 'C':
             // Handle Cleared field
             this.cleared = qiftext;
             break;
           
           case 'N':
             // Handle Cheque Number/Investment Action field
             if ( isInvest ) {
               this.action = qiftext;
             } else {
               this.cheque_number = qiftext;
             }
             break;
           
           case 'P':
             // Handle Payee field
             this.payee = qiftext;
             break;
           
           case 'A':
             // Handle Address field(s)
             this.address.push(qiftext);
             break;
           
           case 'L':
             // Handle Category field
             this.setCategory( this, qiftext );
             break;
           
           // Codes used in Splits 
           case 'S':
             // Handle Category(split) field
             if ( isInvest ) {
               this.add_error("Split (S:Category) not allowed in Invest file");
             } else {
               this.addSplit();
               this.setCategory( this.getCurrentSplit(), qiftext );
             }
             break;
           
           case 'E':
             // Handle Memo(split) field
             if ( isInvest ) {
               this.add_error("Split (E:Memo) not allowed in Invest file");
             } else {
               this.getCurrentSplit().memo = qiftext;
             }
             break;
           
           case '$':
             // Handle Amount(split)/Amount(invest) field
             if ( isInvest ) {
               this.transfer_amount = this.getNumber(qiftext);
             } else {
               this.getCurrentSplit().amount = this.getNumber(qiftext);
             }
             break;
           
           case '%':
             // Handle Allocation(split) field
             if ( isInvest ) {
               this.add_error("Split (%:Allocation) not allowed in Invest file");
             } else {
               this.getCurrentSplit().allocation = this.getNumber(qiftext);
             }
             break;
           
           // Codes used in Investments
           case 'Y':
             // Handle Security Name field
             if ( isInvest ) {
               this.security_name = qiftext;
             } else {
               this.add_error("Invest code (Y:Security Name) not allowed in non-Invest file");
             }
             break;
           
           case 'I':
             // Handle Price field
             if ( isInvest ) {
               this.price = this.getNumber(qiftext);
             } else {
               this.add_error("Invest code (I:Price) not allowed in non-Invest file");
             }
             break;
           
           case 'Q':
             // Handle Quantity field
             if ( isInvest ) {
               this.quantity = this.getNumber(qiftext);
             } else {
               this.add_error("Invest code (Q:Quantity) not allowed in non-Invest file");
             }
             break;
           
           case 'O':
             // Handle Commission field
             if ( isInvest ) {
               this.commission = this.getNumber(qiftext);
             } else {
               this.add_error("Invest code (O:Commission) not allowed in non-Invest file");
             }
             break;
           
           case '':
             // Ignore blank lines
             break;
           
           default:
             this.add_error("Unknown QIF Code: [" + qifcode + "]"); 
             
         }
         
      }
      
      this.linenum = 0;
   
   },
   
   setCategory: function (obj,txt) {

      obj.category_text = txt;
      
      var items = [];
      
      // check for multi-value
      items = txt.split('|');

      if ( items.length > 2 ) {
         this.add_error("Multiple '|' in Category string");
         return;
      }

      if ( items.length == 2 ) {
         txt = items[0];
         obj.transfer_account = items[1].replace(/[\[\]]/g,'');
         obj.category = 'TRAN_SFER';
      }
         
      // check for class
      items = txt.split('/');

      if ( items.length > 2 ) {
         this.add_error("Multiple '/' in Category string");
         return;
      }

      if ( items.length == 2 ) {
         txt = items[0];
         obj.qifclass = items[1];
      }
         
      // check for sub-cat
      items = txt.split(':');

      if ( items.length > 2 ) {
         this.add_error("Multiple ':' in Category string");
         return;
      }

      if ( items.length == 2 ) {
         txt = items[0];
         obj.subcategory = items[1];
      }

      if ( obj.category != 'TRAN_SFER' ) { 
         var re = /^\s*\[(.*)\]\s*$/;
         if ( re.test(txt) ) {
            obj.transfer_account = re.exec(txt)[1];
            obj.category = 'TRAN_SFER';
         } else {
            obj.category = txt;
         }
      }
      
   },
  
   getDate: function (txt) {

      var date = txt.split(/[^\d]/);
      
      if (date[2].length === 2) {
         if ( (0 + date[2]) < 70 ) {
            date[2] = '20' + date[2];
         } else {
            date[2] = '19' + date[2];
         }
      }
      
      return date[2] + '-' + date[1] + '-' + date[0];

   },
   
   // This routine expects numbers to have UK format e.g. 20,510,345.87
   getNumber: function (txt) {
      // Strip unwanted commas
      return parseFloat( txt.replace(/,/g,'') );
   },
   
   addSplit: function () {
      if (!this.splits) { this.splits = []; }
      var split = {};
      this.splits.push(split);
      return split;
   },
   
   getCurrentSplit: function () {
      return this.splits[this.splits.length - 1];
   },
  
   add_error: function (txt) {
      if ( this.linenum > 0 ) {
         txt += ', at line ' + this.linenum;
      }
      this.errors.push('Error: ' + txt);
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

