const highroller = require("highroller");

// outputs
//console.log(highroller.parseEdge("out = 3"));
console.log(highroller.parseEdge("buf_en"));

// conditions
console.log(highroller.parseEdge("out == 3"));
console.log(highroller.parseEdge("~fifo_empty"));
console.log(highroller.parseEdge("(alu_op != TEST) || memes"));
console.log(highroller.parseEdge("!fifo_empty"));

