var fs = require("fs");
var QIFTran = require('./qiftran.js');

function QIFFile( filename ) {

  this.filename = filename;
  this.filetype = 'Unknown';
  this.filelines = 0;

  this.trans = [];
  this.counts = {};
  
  this.errors = [];
  
  this.readQIF();
  
}

QIFFile.prototype = {

   hasError: function() {
      return ( this.errors.length > 0 );
   },

   getSummary: function() {
      console.log("File name: " + this.filename);
      console.log("File type: " + this.filetype);
      console.log("File lines: " + this.filelines);
      console.log("Found " + this.trans.length + " QIF transactions\n");
   },

   readQIF: function () {
  
      var qifcode='', qifvalue='', lineno=0, qifarray = [];
      var i, txn;
     
      // Get an array of lines in the QIF file
      var qiflines = fs.readFileSync(this.filename, { encoding: 'utf8' }).split(/\r?\n/);
      this.filelines = qiflines.length; 
       
      // Check QIF file type
      if ( qiflines[0].slice(0,6) != '!Type:' ) {
         this.add_error("Invalid QIF file type: " + qiflines[0] + ", at line 1");
         return;
      }
      this.filetype = qiflines[0].slice(6);
      var isInvest = ( this.filetype == 'Invest' );
       
      // Collect the QIF lines into transactions
      for ( i=1; i<qiflines.length; i++ ) {
         
         // Get the type and value of this QIF line
         qifcode  = qiflines[i].slice(0,1).toUpperCase();
         qifvalue = qiflines[i].slice(1);
         lineno   = i + 1;
         
         if ( qifcode == '^' ) {
            txn = new QIFTran( this.filetype, qifarray, lineno - qifarray.length );
            if ( txn.hasError() ) {
               this.add_error( txn.errors.join("\n") );
            }
            this.trans.push(txn);
            qifarray = [];
         } else {
            qifarray.push( [ qifcode, qifvalue ] );
         }
      
      }
    
      return true;
  
   },
  
   dumpTran: function () {
      for ( var i=0; i<this.trans.length; i++ ) {
         console.log(this.trans[i]);
      }
   },
  
   countPropertyValues: function ( props ) {
      var txn;

      // Ensure the counts object has the requied properties
      if ( !props ) {
         props = [ 'category_text', 'transfer_account', 'category', 'subcategory', 'classname' ];
      }
      for ( var p=0; p<props.length; p++ ) {
         if ( !this.counts[props[p]] ) { this.counts[props[p]] = {}; }
      }
      
      for ( var i=0; i<this.trans.length; i++ ) {
         txn = this.trans[i];

         // Gather counts of primary category data
         this.prop_count( this.counts, txn );

         // Gather counts of split category data
         if ( txn.splits && txn.splits.length > 0 ) {
            for ( var j=0; j<txn.splits.length; j++ ) {
               this.prop_count( this.counts, txn.splits[j] );
            }
         }
      }

   },
  
   prop_count: function ( counts, obj ) {

      // Gather counts of category data
      for ( var prop in counts ) {
         if ( obj[prop] ) {
            if ( !(obj[prop] in counts[prop]) ) {
               counts[prop][obj[prop]] = 0;
            }
            counts[prop][obj[prop]] += 1;
         }
      }
      
   },
   
   listPropertyValues: function() {

      var hdr = [ 'filename', 'property', 'value', 'count' ];
      var out = [ hdr ], txt = ''; 
      
      // Collect the property names
      for ( var prop in this.counts ) {
         // Collect the property value and counts
         for ( var val in this.counts[prop] ) {
            out.push( [ this.filename, prop, val, this.counts[prop][val] ] );
         }
      }
      
      // Return the lines as TSV text
      for ( var i=0; i<out.length; i++ ) {
         txt += out[i].join('\t') + '\r\n';
      }
      
      return txt;
      
   },
   
   add_error: function (txt,lineno) {
      if ( lineno > 0 ) {
         txt += ', at line ' + lineno;
      }
      this.errors.push(txt);
   }
  
};

module.exports = QIFFile;
