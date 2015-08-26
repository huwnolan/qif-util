var fs = require("fs");

function QIFTran( lines, startline, filetype ) {
   
   this.filetype  = filetype  || "Bank";
   this.startline = startline || 1;
   this.errors = [];

   if ( !lines || lines.length <= 0 ) {
      this.add_error("QIF Transaction: No lines supplied");
      return;
   }
      
   this.read_lines( lines, ( startline || 1 ) );
   
}

QIFTran.prototype = {

   getFiletype: function() {
      return this.filetype;
   },

   getStartline: function() {
      return this.startline;
   },

   getErrors: function() {
      return this.errors.join('\n');
   },

   hasError: function() {
      return ( this.errors.length > 0 );
   },

   read_lines: function ( lines, startline ) {
      
      var qifcode, qiftext, lineno;
      var isInvest = ( this.filetype == 'Invest' );

      for ( var i=0; i<lines.length; i++ ) {
         qifcode = lines[i][0];
         qiftext = lines[i][1];
         lineno  = startline + i;

         switch (qifcode) {
           
           case 'D':
             // Handle Date field
             this.date = this.get_date(qiftext);
             break;
           
           case 'T':
             // Handle Amount field
             this.amount = this.get_number(qiftext);
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
             this.set_category( this, qiftext, lineno );
             break;
           
           // Codes used in Splits 
           case 'S':
             // Handle Category(split) field
             if ( isInvest ) {
               this.add_error("Split (S:Category) not allowed in Invest file",lineno);
             } else {
               this.add_split();
               this.set_category( this.get_current_split(), qiftext, lineno );
             }
             break;
           
           case 'E':
             // Handle Memo(split) field
             if ( isInvest ) {
               this.add_error("Split (E:Memo) not allowed in Invest file",lineno);
             } else {
               this.get_current_split().memo = qiftext;
             }
             break;
           
           case '$':
             // Handle Amount(split)/Amount(invest) field
             if ( isInvest ) {
               this.transfer_amount = this.get_number(qiftext);
             } else {
               this.get_current_split().amount = this.get_number(qiftext);
             }
             break;
           
           case '%':
             // Handle Allocation(split) field
             if ( isInvest ) {
               this.add_error("Split (%:Allocation) not allowed in Invest file",lineno);
             } else {
               this.get_current_split().allocation = this.get_number(qiftext);
             }
             break;
           
           // Codes used in Investments
           case 'Y':
             // Handle Security Name field
             if ( isInvest ) {
               this.security_name = qiftext;
             } else {
               this.add_error("Invest code (Y:Security Name) not allowed in non-Invest file",lineno);
             }
             break;
           
           case 'I':
             // Handle Price field
             if ( isInvest ) {
               this.price = this.get_number(qiftext);
             } else {
               this.add_error("Invest code (I:Price) not allowed in non-Invest file",lineno);
             }
             break;
           
           case 'Q':
             // Handle Quantity field
             if ( isInvest ) {
               this.quantity = this.get_number(qiftext);
             } else {
               this.add_error("Invest code (Q:Quantity) not allowed in non-Invest file",lineno);
             }
             break;
           
           case 'O':
             // Handle Commission field
             if ( isInvest ) {
               this.commission = this.get_number(qiftext);
             } else {
               this.add_error("Invest code (O:Commission) not allowed in non-Invest file",lineno);
             }
             break;
           
           case '':
             // Ignore blank lines
             break;
           
           default:
             this.add_error("Unknown QIF Code: [" + qifcode + "]",lineno); 
             
         }
         
      }
      
      if ( this.date === undefined ) {
         this.add_error("QIF Transaction has no date");
      }
      
   },
   
   set_category: function (obj,txt,lineno) {

      obj.category_text = txt;
      
      var items = [];
      
      // check for multi-value
      items = txt.split('|');

      if ( items.length > 2 ) {
         this.add_error("Multiple '|' in Category string",lineno);
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
         this.add_error("Multiple '/' in Category string",lineno);
         return;
      }

      if ( items.length == 2 ) {
         txt = items[0];
         obj.classname = items[1];
      }
         
      // check for sub-cat
      items = txt.split(':');

      if ( items.length > 2 ) {
         this.add_error("Multiple ':' in Category string",lineno);
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
  
   // This routine expects dates to have UK format e.g. dd-mm-yyyy
   get_date: function (txt) {

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
   get_number: function (txt) {
      // Strip unwanted commas
      return parseFloat( txt.replace(/,/g,'') );
   },
   
   add_split: function () {
      if (!this.splits) { this.splits = []; }
      var split = {};
      this.splits.push(split);
      return split;
   },
   
   get_current_split: function () {
      if (!this.splits) { return {}; }
      return this.splits[this.splits.length - 1];
   },
  
   add_error: function (txt,lineno) {
      if ( lineno ) {
         txt += ', at line ' + lineno;
      }
      this.errors.push(txt);
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

