var fs = require("fs");
var QIFTran = require('./qiftran.js');

function QIFFile( filename ) {
  this.filename = filename;
  this.filetype = 'Unknown';
  this.trans = [];
  this.types = [];
  this.counts = {};
}

QIFFile.prototype = {

  readQIF: function () {
  
    var i, j, o = {}, qifcode='', qifvalue='', split_no=0, qifarray = [];
    var txn, me = this;
  
    // Get an array of lines in the QIF file
    var qiflines = fs.readFileSync(this.filename, { encoding: 'utf8' }).split(/\r?\n/);
    
    console.log("File name: " + this.filename);
    
    // Check QIF file type
    if ( qiflines[0].slice(0,6) != '!Type:' ) {
      console.error("Invalid QIF file type: " + qiflines[0]);
      return null;
    }
    
    this.filetype = qiflines[0].slice(6);
    console.log("File type: " + this.filetype);
    console.log("File lines: " + qiflines.length);
  
    var isInvest = ( this.filetype == 'Invest' );
    
    // Collect the QIF lines into transactions
    for ( i=1; i<qiflines.length; i++ ) {
      
      // Get the type and value of this QIF line
      qifcode  = qiflines[i].slice(0,1).toUpperCase();
      qifvalue = qiflines[i].slice(1);
      
      if ( qifcode == '^' ) {
         txn = new QIFTran( this.filetype, qifarray, i + 1 - qifarray.length );
         this.trans.push(txn);
         qifarray = [];
      } else {
         qifarray.push( [ qifcode, qifvalue ] );
      }
      
    }
//    
//    function saveit (sn) {
//      
//      var qc = qifcode;
//      if (sn) { qc += '' + sn; }
//  
//      // Collect QIF types and counts
//      if ( qc in me.counts ) {
//        me.counts[qc] += 1;
//      } else {
//        me.types.push(qc);
//        me.counts[qc] = 1;
//      }
//      
//      // Save the value of this QIF type
//      o[qc] = qiflines[i].slice(1);
//      
//    }
    
    console.log("Found " + this.trans.length + " QIF transactions\n");
    return true;
  
  },
  
   dumpTran: function () {
      for ( var i=0; i<this.trans.length; i++ ) {
         console.log(this.trans[i]);
      }
   },
  
   dumpCats: function () {
      var txn, spl, counts = { 
         category_text: {}, 
         transfer_account: {}, 
         category: {}, 
         subcategory: {}, 
         qifclass: {} 
         };
      for ( var i=0; i<this.trans.length; i++ ) {
         txn = this.trans[i];

         // Gather counts of primary category data
         this.prop_count( counts, txn );

         // Gather counts of split category data
         if ( txn.splits && txn.splits.length > 0 ) {
            for ( var j=0; j<txn.splits.length; j++ ) {
               this.prop_count( counts, txn.splits[j] );
            }
         }
      }
      console.log(counts);
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
