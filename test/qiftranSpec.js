var expect  = require("chai").expect;
var QIFTran = require("../lib/qiftran");

describe("QIFTran", function() {
   describe("Initialise", function() {

      describe("Default behaviour", function() {

         var qt = new QIFTran();
   
         it("should default startline to 1, if not supplied", function(){
            expect(qt.getStartline()).to.equal(1);
         });
   
         it("should default filetype to 'Bank', if not supplied", function(){
            expect(qt.getFiletype()).to.equal("Bank");
         });
   
         it("should contain an error if no lines are supplied", function(){
            expect(qt.hasError()).to.be.true;
            expect(qt.getErrors()).to.equal("QIF Transaction: No lines supplied");
         });

      });
      
      describe("Process QIF lines", function() {

         var ql = [
           [ 'P', 'Waitrose' ],
           [ '$', '3.45' ],
         ];

         var qt = new QIFTran(ql);

         it("should not contain an error if lines are valid", function(){
            expect(qt.hasError()).to.be.false;
         });
   
      });
      
   });

   
});
