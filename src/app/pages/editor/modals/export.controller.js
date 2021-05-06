(function() {
  'use strict';

  angular
    .module('app')
    .controller('ExportController', ExportController);

  ExportController.$inject = [
    '$scope',
    '$document',
    '$window',
    '$stateParams',
    'dialogService',
    'notificationService',
    'storageService'
  ];

  function ExportController($scope,
                            $document,
                            $window,
                            $stateParams,
                            dialogService,
                            notificationService,
                            storageService) {
    var vm = this;
    vm.type        = null;
    vm.format      = null;
    vm.compact     = '';
    vm.pretty      = '';
    vm.subPath     = '';
    vm.result      = null;
    vm.data        = null;
    vm.hideCompact = false;
    vm.showCompact = showCompact;
    vm.showPretty  = showPretty;
    vm.select      = select;
    vm.save        = save;

    _active();

    function _active() {
      vm.type = $stateParams.type;
      vm.format = $stateParams.format;

      var e = $window.editor.export;

      if (vm.type === 'project' && vm.format === 'json') {
        _createJson(e.projectToData());
      }
      else if (vm.type === 'tree' && vm.format === 'json') {
        _createJson(e.treeToData());
      }
      else if (vm.type === 'trees' && vm.format === 'json') {
		    _createJson(e.treesToData(null,false));
      }
      else if (vm.type === 'nodes' && vm.format === 'json') {
        _createJson(e.nodesToData());
      }
    }

    function _fetchSubPath(parent,custom_folders) {
      var retStr = "";
      var node;
      for (var i = 0; i < custom_folders.length; i++) {
        if (custom_folders[i].name == parent) {
          node = custom_folders[i];
          break;
        }
      }
      if (node.parent == undefined) {
        retStr = "/" + node.title;
      } else {
        retStr = _fetchSubPath(node.parent,custom_folders) + "/" + node.title;
      }
      return retStr;
    }

    function _createJson(data) {
      vm.data = data;
      vm.compact = JSON3.stringify(data);
      vm.pretty = JSON3.stringify(data, null, 2);
      vm.result = vm.pretty;
      vm.subPath = "/";
      if (data.parent == undefined) {
        return;
      }
      if (data.custom_folders == undefined) {
        return;
      }
      vm.subPath = _fetchSubPath(data.parent,data.custom_folders) + "/";
     }

    function select(){
      var range = $document[0].createRange();
      range.selectNodeContents($document[0].getElementById('export-result'));
      var sel = $window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function save() {

      var defaultName = null;
      var project = $window.editor.project.get();
      if (!project) return;
      if ( vm.type === 'tree') {
        var tree = project.trees.getSelected();
        var root = tree.blocks.getRoot();
        defaultName = root.title;
        dialogService
            .saveAs(defaultName, ['.json'])
            .then(function(path) {
              storageService
                .saveAsync(path, vm.pretty)
                .then(function() {
                  notificationService.success(
                    'File saved',
                    'The file has been saved successfully.'
                  );
                });
            });
      }else if (vm.type === 'trees') {
        dialogService
          .openDirectory()
          .then(function(p){
            var path= require('path');
            tree = project.trees.each(function(tree) {
              var root = tree.blocks.getRoot();
              defaultName = root.title;
              var fs = require('fs');
              var e = $window.editor.export;
              _createJson(e.treeToData(tree));
              var subPath = p +vm.subPath;
              subPath=subPath.split(path.sep).join('/')
              try {
                var s = fs.statSync(subPath);
              } catch (e) {
                fs.mkdirSync(subPath, { recursive: true }, function(err) {
                  if (err != null)
                  {
                    notificationService.warning('Warning',err.message);
                  }
                }
                  );
              }
              _createJson(e.treeToData(tree,true));
              fs.writeFileSync(subPath+defaultName +'.json', vm.pretty);
              
            });
            notificationService.success('通知','操作结束');
          });
      }
    }

    function showCompact() {
      vm.result = vm.compact;
    }
    function showPretty() {
      vm.result = vm.pretty;
    }
  }

})();