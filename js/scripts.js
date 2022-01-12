/* global Vue, nodeRadius, draw, exportJson, importJson, localStorage,
   DEFAULT_SETUP, URL, Blob, crossBrowserKey, updateSelectedObject,
   clearErrors, addError */

const LOCALSTORAGE_KEY = 'ferris_Last_User_Data';

function convert(obj, meta) {
  let output = {};
  output.version = 2;
  output.meta = meta;
  output.machine = {};
  output.machine.nodes = obj.nodes.map((x, i) => {
    return {
      id: i,
      name: x.name,
      output: x.outputs,
      _parent: i
    };
  });
  output.machine.edges = obj.links.map((x, i) => {
    let res = {};
    if (x.type == 'StartLink') {
      if (output.meta.reset) {
        window.ferris.opts.logger(4, `Overwriting reset state to ${x.node} due to duplicate reset transitions`);
      }
      output.meta.reset = x.node;
      return;
    } else if (x.type == 'Link') {
      res.start = x.nodeA;
      res.end = x.nodeB;
    } else if (x.type == 'SelfLink') {
      res.start = x.node;
      res.end = x.node;
    }

    res.condition = x.condition;
    res.output = x.outputs;
    res._parent = i;
    return res;
  }).filter(x => x);

  return output;
}

function parseErrors(fsmData, metadataLog) {
  // we know there is a 1 to 1 mapping for node/edge numbers
  for (var i = 0; i < metadataLog.length; i++) {
    let metadata = metadataLog[i].meta;
    let msg = metadataLog[i].msg;
    let metadataParts = metadata.split('.');
    let nbr = metadata.length > 1 ? parseInt(metadataParts[0].substring(1), 10) : null;
    let onbr = null;
    if (metadataParts.length == 2 && metadataParts[1].length > 1) {
      onbr = parseInt(metadataParts[1].substring(1), 10);
    }

    console.log('parsed out error #', nbr);
    console.log(fsmData);

    if (metadata[0] == 'e') {
      // edge
      addError('link', fsmData.edges[nbr]._parent, {message: msg, outputNumber: onbr});
    } else if (metadata[0] == 'n') {
      // node
      addError('node', fsmData.nodes[nbr]._parent, {message: msg, outputNumber: onbr});
    }
  }
}

window.addEventListener('load', function() {
  var nodeRadiusUpdate = null;

  var app = new Vue({
    el: '#controller',
    data: {
      projectName: '',
      sidebarShowing: false,
      sidebarItem: 'build-settings',
      inputSignals: [],
      outputSignals: [],
      opts: {
        outputType: "file",
        clock: {name: "clock", edge: "posedge"},
        reset: {name: "reset_n", edge: "negedge"},
        cstate: "cstate",
        nstate: "nstate",
        style: {
          indent: "  ",
          // skip outputting the transition to same state
          skipOutputTransitionToSameState: true,
        },
        // the logger to use
        logger: function(level, message, metadata) {
          console.log(`Log ${level}: ${message}`);
          if (level > 0) {
            app.highrollerLog += `${message}\n`;
          }
          if (metadata) {
            for (var i = 0; i < metadata.length; i++) {
              window.ferris.metadataLog.push({meta: metadata[i], msg: message});
            }
          }
        }.bind(this),
      },
      nodesize: 80,
      highrollerLog: '',
      metadataLog: [],
      result: '',
      saveText: 'save current state in browser',
      editingItem: {
        valid: false,
        type: '',
        // only valid for nodes
        name: '',
        // only valid for edges
        condition: '',
        // valid for either one
        outputs: [],
        warnings: [],
        badOutputs: []
      }
    },
    methods: {
      toggleShow: function(mode) {
        if (mode && !this.sidebarShowing) {
          // show the sidebar and this content
          this.sidebarShowing = true;
          this.sidebarItem = mode;
        } else if (mode && this.sidebarItem != mode) {
          // switch to this
          this.sidebarItem = mode;
        } else {
          // hide sidebar
          this.sidebarShowing = false;
          this.sidebarItem = null;
        }
      },
      addInputSignal: function() {
        this.inputSignals.push({name: "", width: 1});
      },
      removeInputSignal: function(idx) {
        this.inputSignals.splice(idx, 1);
      },
      addOutputSignal: function() {
        this.outputSignals.push({name: "", width: 1, inverted: false});
      },
      removeOutputSignal: function(idx) {
        this.outputSignals.splice(idx, 1);
      },
      build: function() {
        this.highrollerLog = '';
        this.result = '';
        this.metadataLog = [];
        clearErrors();
        let meta = {
          name: this.projectName,
          signals: {
            input: this.inputSignals,
            output: this.outputSignals
          }
        };

        let opts = this.opts;
        let fsmData = JSON.parse(exportJson());
        let hrFsmData = convert(fsmData, meta);
        let verilogData = window.highroller.convert(hrFsmData, opts);
        this.result = verilogData;

        // parse out errors
        parseErrors(hrFsmData.machine, this.metadataLog);
        draw();

        if (this.sidebarItem != 'output-log') this.toggleShow('output-log');
      },
      copyResult: function() {
        this.$refs.outResultCode.select();
        document.execCommand('copy', false);
      },
      openFile: function() {
        this.$refs.inputFile.click();
      },
      load: function(fromFile) {
        if (fromFile) {
          // load from input file
          let file = this.$refs.inputFile.files[0];
          let fileReader = new FileReader();
          fileReader.addEventListener('load', function(fileLoadedEvent) {
            try {
              this.restoreState(JSON.parse(fileLoadedEvent.target.result));
            } catch (e) {
              // TODO: notify user of parse error
              console.log(e);
            }
            // clear existing
            this.$refs.inputFile.value = '';
          }.bind(this));

          // read file
          fileReader.readAsText(file, 'UTF-8');
        } else {
          // load from localstorage
          let lastSave = localStorage.getItem(LOCALSTORAGE_KEY);
          if (!lastSave) {
            // no existing save in localstorage, so load default
            lastSave = DEFAULT_SETUP;
          } else {
            lastSave = JSON.parse(lastSave);
          }

          this.restoreState(lastSave);
        }
      },
      restoreState: function(state) {
        for (var key in DEFAULT_SETUP) {
          if (!DEFAULT_SETUP.hasOwnProperty(key)) continue;

          if (key == 'riesenradState') {
            // we don't actually keep an up-to-date riesenrad state at all times
            importJson(state[key]);
          } else if (key == 'opts') {
            for (var second_key in state[key]) {
              this[key][second_key] = state[key][second_key];
            }
          } else {
            this[key] = state[key];
          }
        }

        this.updateProjectName();
        this.updateNodeSize();
      },
      saveState: function() {
        let exportedState = {};
        for (var key in DEFAULT_SETUP) {
          if (!DEFAULT_SETUP.hasOwnProperty(key)) continue;

          if (key == 'riesenradState') {
            // we don't actually keep an up-to-date riesenrad state at all times
            exportedState[key] = exportJson(true);
          } else {
            exportedState[key] = this[key];
          }
        }
        this.saveText = `save current state in browser (last saved at ${new Date().toLocaleTimeString()})`;

        let exportedStateString = JSON.stringify(exportedState);
        localStorage.setItem(LOCALSTORAGE_KEY, exportedStateString);
        return exportedStateString;
      },
      exportState: function() {
        let state = this.saveState();
        var link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([state], {type: 'text/json'}));
        link.download = `${this.projectName}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
      },
      updateProjectName: function() {
        if (this.projectName.length > 0) {
          document.title = this.projectName + ' · 🎡';
        } else {
          document.title = '🎡';
        }
      },
      updateNodeSize: function() {
        if (nodeRadiusUpdate) {
          clearTimeout(nodeRadiusUpdate);
        }
        nodeRadiusUpdate = setTimeout(function() {
          nodeRadius = this.nodesize;
          draw();
        }.bind(this), 10);
      },
      // riesenrad calls this function to start editing an item
      editItem: function(itemType, item) {
        // TODO: store a lot more information in node/edge
        // this will be part of moore machine support task
        this.editingItem.type = itemType;

        this.editingItem.name = item.name;
        this.editingItem.condition = item.condition;
        this.editingItem.outputs = item.outputs;
        this.editingItem.warnings = item.errors;
        this.editingItem.badOutputs = Array(item.outputs.length).fill(false);
        console.log(item.errors);
        for (var i = 0; i < item.errors.length; i++) {
          if (item.errors[i].outputNumber != null) {
            this.editingItem.badOutputs[item.errors[i].outputNumber] = true;
          }
        }

        this.editingItem.valid = true;

        // show property inspector
        if (this.sidebarItem != 'property-inspector') this.toggleShow('property-inspector');
        setTimeout(function() {
          // focus the item
          if (this.editingItem.type == 'node') {
            this.$refs.nodenameentry.focus();
          } else {
            this.$refs.edgeconditionentry.focus();
          }
        }.bind(this), 1);
      },
      // parameter true if discard changes
      commitEditItem: function(discardChanges) {
        // commit changes made
        this.editingItem.valid = false;
        if (discardChanges) {
          return;
        }

        if (this.editingItem.type == 'node') {
          updateSelectedObject(this.editingItem.name, null, this.editingItem.outputs);
        } else {
          updateSelectedObject(null, this.editingItem.condition, this.editingItem.outputs);
        }
      },
      propInspectRemoveOutput: function(index) {
        this.editingItem.outputs.splice(index, 1);
        this.editingItem.badOutputs.splice(index, 1);
      },
      propInspectAddOutput: function() {
        this.editingItem.outputs.push('');
        this.editingItem.badOutputs.push(false);
      }
    },
    created: function() {
      this.load(false);
    }
  });

  window.ferris = app;

  // key binding handlers
  document.addEventListener('keydown', function(e) {
    let key = crossBrowserKey(e);

    if (e.metaKey || e.ctrlKey) {
      if (key == 66) { // ctrl-b
        app.build();
        e.preventDefault();
      } else if (key == 83) { // ctrl-s
        if (e.shiftKey) { // ctrl-shift-s
          app.exportState();
          e.preventDefault();
        } else { // ctrl-s
          app.saveState();
          e.preventDefault();
        }
      } else if (key == 79) { // ctrl-o
        app.openFile();
        e.preventDefault();
      } else if (key == 76) { // ctrl-l
        app.toggleShow('output-log');
        e.preventDefault();
      } else if (key == 80) { // ctrl-p
        app.toggleShow('build-settings');
        e.preventDefault();
      }
    }
    if (key == 112) { // F1
      app.toggleShow('help-text');
      e.preventDefault();
    }
  });
});
