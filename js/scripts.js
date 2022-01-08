/* global Vue, nodeRadius, draw, exportJson, importJson, localStorage,
   DEFAULT_SETUP, URL, Blob, crossBrowserKey */

const LOCALSTORAGE_KEY = 'ferris_Last_User_Data';

function convert(obj, meta) {
  let output = {};
  output.version = 2;
  output.meta = meta;
  output.machine = {};
  output.machine.nodes = obj.nodes.map((x, i) => {
    return {
      id: i,
      name: x.text
    };
  });
  output.machine.edges = obj.links.map((x, i) => {
    let res = {};
    if (x.type == 'StartLink') {
      if (output.meta.reset) {
        // TODO: send message to user that we are overwriting the reset node
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

    let condOut = x.text.split('/');
    if (condOut.length != 2) {
      // TODO: error out here
    }
    res.condition = condOut[0].split(' ').join('');
    let outputVars = condOut[1].split(' ').join('');
    res.output = outputVars.length > 0 ? outputVars.split(',') : [];

    return res;
  }).filter(x => x);

  return output;
}

window.addEventListener('load', function() {
  var nodeRadiusUpdate = null;

  var app = new Vue({
    el: '#controller',
    data: {
      projectName: '',
      sidebarShowing: true,
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
        logger: function(level, message) {
          console.log(`Log ${level}: ${message}`);
          app.highrollerLog += `${message}\n`;
          console.log(app.highrollerLog);
        },
      },
      nodesize: 80,
      highrollerLog: '',
      result: '',
      saveText: 'save current state in browser'
    },
    methods: {
      toggleShow: function(mode) {
        if (!this.sidebarShowing) {
          // show the sidebar and this content
          this.sidebarShowing = true;
          this.sidebarItem = mode;
        } else if (this.sidebarItem != mode) {
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
        let meta = {
          name: this.projectName,
          signals: {
            input: this.inputSignals,
            output: this.outputSignals
          }
        };

        let opts = this.opts;
        let fsmData = JSON.parse(exportJson());
        let verilogData = window.highroller.convert(convert(fsmData, meta), opts);
        this.result = verilogData;
        if (this.sidebarItem != 'output-log') this.toggleShow('output-log');
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
      // TODO: also called periodically by other things
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
