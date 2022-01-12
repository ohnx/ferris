// the test object we will attempt to turn into SystemVerilog
const TEST_OBJ = {
  version: 3,
  machine: {
    nodes: [
      // all nodes have an id and a name, as well as an optional output
      {id: 1, name: "WAIT_READ", output: ["buf_en"]},
      {id: 2, name: "WAIT_WRITE"},
      {id: 3, name: "WRITE_DELAY"},
      {id: 4, name: "WRITE0"},
      {id: 5, name: "WRITE1"},
      {id: 6, name: "WRITE2"},
      {id: 7, name: "WRITE3", output: ["buf_en"]},
      // id's don't have to be sequential
    ],
    edges: [
      // all edges describe a start, end, condition, and output
      // TODO: fsm's look nicer with ~ instead of !, can we use that instead?
      {start: 1, end: 1, condition: "fifo_empty", output: ["buf_en"]},
      {start: 1, end: 2, condition: "!fifo_empty", output: ["buf_en", "fifo_read"]},
      {start: 2, end: 3, condition: "free_outbound", output: []},
      {start: 2, end: 2, condition: "!free_outbound", output: []},
      {start: 3, end: 4, condition: "", output: ["put_outbound", "sel = 0"]},
      {start: 4, end: 5, condition: "", output: ["put_outbound", "sel = 1"]},
      {start: 5, end: 6, condition: "", output: ["put_outbound", "sel = 2"]},
      {start: 6, end: 7, condition: "", output: ["put_outbound", "sel = 3"]},
      {start: 7, end: 1, condition: "fifo_empty", output: ["buf_en"]},
      {start: 7, end: 2, condition: "!fifo_empty", output: ["buf_en", "fifo_read"]},
    ]
  },
  // additional metadata needed to build a proper representation
  meta: {
    name: "NFTB_fsm",
    // reset state
    reset: 1,
    signals: {
      // signals (input/output) 
      input: [
        {
          // input signals have a name and a width
          name: "fifo_empty",
          width: 1
        },
        {name: "free_outbound", width: 1}
      ],
      output: [
        // output signals also have an extra parameter:
        // for width = 1 signals, if they are inverted
        // inverted == true if they are ACTIVE LOW
        // inverted == false if they are ACTIVE HIGH
        // for width > 1 signals, a "default" setting (if not specified, defaults to 0)
        {name: "fifo_read", width: 1, inverted: false},
        {name: "buf_en", width: 1, inverted: false},
        {name: "sel", width: 2},
        {name: "put_outbound", width: 1, inverted: false}
      ]
    }
  }
};

// log levels go from 0 (debug) to 5 (bad)
const TEST_OPTIONS = {
  // options for outputType:
  // file (have stuff like `default_nettype + module),
  // module (input/output, etc.). Use name as module name
  // code (just the FSM itself)
  outputType: "file",
  // clock and reset options are only used for file/module options
  clock: {
    // name of the clock signal
    name: "clock",
    // edge to care about (options are posedge or negedge)
    edge: "posedge"
  },
  reset: {
    // name of reset signal
    name: "reset_n",
    // edge to care about (options are posedge or negedge)
    edge: "negedge"
  },
  // in case we need to remap
  cstate: "cstate",
  nstate: "nstate",
  // style:
  style: {
    // indent by what (can put spaces/tabs/whatever in here)
    indent: "  ",
    // skip outputting the transition to same state
    skipOutputTransitionToSameState: true,
  },
  // the logger to use
  logger: function(level, message, meta) {
    // metadata format:
    // node: nXXX
    // edge: eXXX
    // optionally: nXXX.oYYY or eXXX.oYYY for the YYYth (from 0) output of
    // node/edge XXX
    console.log(`Log ${level}: ${message} ${meta ? `(metadata: ${meta})` : ''}`);
  },
};

const highroller = require('../src/index.js');

console.log(JSON.stringify(TEST_OBJ, null, 2));
console.log(highroller.convert(TEST_OBJ, TEST_OPTIONS));
