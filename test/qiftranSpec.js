var expect  = require("chai").expect;
var QIFTran = require("../lib/qiftran");

describe("QIFTran", function() {
   describe("Initialise", function() {

      describe("Default behaviour", function() {

         var qt = new QIFTran();
   
         it("should set startline to 1 and filetype to 'Bank', if not supplied", function(){
            expect(qt.getStartline()).to.equal(1);
            expect(qt.getFiletype()).to.equal("Bank");
         });
   
         it("should report an error if no lines are supplied", function(){
            expect(qt.hasError()).to.be.true;
            expect(qt.getErrors()).to.equal("QIF Transaction: No lines supplied");
         });

      });
      
      describe("Process Bank transactions", function() {

         it("should successfully parse a valid transaction", function(){
            
            var lines = [
               [ 'D', "11/06'2013" ],
               [ 'T', '-49.70' ],
               [ 'P', 'South West Trains' ],
               [ 'L', 'Expenses:Travel/Huw' ]
            ];
            
            var tran = {
               date : '2013-06-11',
               payee : 'South West Trains',
               amount : -49.70,
               category : 'Expenses',
               subcategory : 'Travel',
               classname : 'Huw'
            }
            
            var qt = new QIFTran(lines);

            expect(qt.hasError()).to.be.false;
            for ( var p in tran ) {
               expect(qt[p]).to.equal(tran[p]);
            }

         });
   
         it("should report an error if no date is present", function(){
            
            var lines = [
               [ 'T', '-49.70' ],
               [ 'P', 'South West Trains' ],
               [ 'L', 'Expenses:Travel/Huw' ]
            ];
            
            var qt = new QIFTran(lines);

            expect(qt.hasError()).to.be.true;
            expect(qt.getErrors()).to.equal("QIF Transaction has no date");

         });
   
         it("should report error(s) if illegal entries are found", function(){
            var lines = [
               [ 'D', "01/09/2012" ],
               [ 'P', 'Waitrose' ],
               [ 'T', '3.45' ],
               [ 'X', 'BadBank' ], // Code 'X' is not a legal code
               [ 'Y', 'BadBank' ]  // Code 'Y' should not appear in Bank type files
            ];
            
            var errs = [
               "Unknown QIF Code: [X], at line 4",
               "Invest code (Y:Security Name) not allowed in non-Invest file, at line 5"
            ].join('\n');
            
            var qt = new QIFTran(lines);
            expect(qt.hasError()).to.be.true;
            expect(qt.getErrors()).to.equal(errs);
         });
   
      });
      
      describe("Process Invest transactions", function() {

         it("should successfully parse a valid transaction", function(){
            
            var lines = [
               [ 'D', "11/06'2013" ],
               [ 'T', '-49.70' ],
               [ 'P', 'South West Trains' ],
               [ 'L', 'Expenses:Travel/Huw' ]
            ];
            
            var tran = {
               date : '2013-06-11',
               payee : 'South West Trains',
               amount : -49.70,
               category : 'Expenses',
               subcategory : 'Travel',
               classname : 'Huw'
            }
            
            var qt = new QIFTran(lines, 0,'Invest');

            expect(qt.hasError()).to.be.false;
            for ( var p in tran ) {
               expect(qt[p]).to.equal(tran[p]);
            }

         });
   
         it("should report error(s) if illegal entries are found", function(){
            var lines = [
               [ 'D', "01/09/2012" ],
               [ 'P', 'Waitrose' ],
               [ 'T', '3.45' ],
               [ 'S', 'Cat:Subcat' ], // Code 'S' should not appear in Invest type files
               [ 'E', 'Memo' ]        // Code 'E' should not appear in Invest type files
            ];
            
            var errs = [
               "Split (S:Category) not allowed in Invest file, at line 4",
               "Split (E:Memo) not allowed in Invest file, at line 5"
            ].join('\n');
            
            var qt = new QIFTran(lines,1,'Invest');
            expect(qt.hasError()).to.be.true;
            expect(qt.getErrors()).to.equal(errs);
         });
   
      });
      
   });

   
});
