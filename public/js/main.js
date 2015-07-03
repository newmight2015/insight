// Source: public/src/js/app.js
var defaultLanguage = localStorage.getItem('insight-language') || 'en';
var defaultCurrency = localStorage.getItem('insight-currency') || 'BTCD';

angular.module('insight',[
  'ngAnimate',
  'ngResource',
  'ngRoute',
  'ngProgress',
  'ui.bootstrap',
  'ui.route',
  'monospaced.qrcode',
  'gettext',
  'angularMoment',
  'insight.system',
  'insight.socket',
  'insight.blocks',
  'insight.transactions',
  'insight.address',
  'insight.search',
  'insight.status',
  'insight.connection',
  'insight.currency',
  'insight.messages'
]);

angular.module('insight.system', []);
angular.module('insight.socket', []);
angular.module('insight.blocks', []);
angular.module('insight.transactions', []);
angular.module('insight.address', []);
angular.module('insight.search', []);
angular.module('insight.status', []);
angular.module('insight.connection', []);
angular.module('insight.currency', []);
angular.module('insight.messages', []);

// Source: public/src/js/controllers/address.js
angular.module('insight.address').controller('AddressController',
  function($scope, $rootScope, $routeParams, $location, Global, Address, getSocket) {
    $scope.global = Global;


    var socket = getSocket($scope);

    var _startSocket = function () {
      socket.emit('subscribe', $routeParams.addrStr);
      socket.on($routeParams.addrStr, function(tx) {
        $rootScope.$broadcast('tx', tx);
        var beep = new Audio('/sound/transaction.mp3');
        beep.play();
      });
    };

    socket.on('connect', function() {
      _startSocket();
    });

    $scope.params = $routeParams;


    $scope.findOne = function() {
      $rootScope.currentAddr = $routeParams.addrStr;
      _startSocket();

      Address.get({
          addrStr: $routeParams.addrStr
        },
        function(address) {
          $rootScope.titleDetail = address.addrStr.substring(0, 7) + '...';
          $rootScope.flashMessage = null;
          $scope.address = address;
        },
        function(e) {
          if (e.status === 400) {
            $rootScope.flashMessage = 'Invalid Address: ' + $routeParams.addrStr;
          } else if (e.status === 503) {
            $rootScope.flashMessage = 'Backend Error. ' + e.data;
          } else {
            $rootScope.flashMessage = 'Address Not Found';
          }
          $location.path('/');
        });
    };

  });

// Source: public/src/js/controllers/blocks.js
angular.module('insight.blocks').controller('BlocksController',
  function($scope, $rootScope, $routeParams, $location, Global, Block, Blocks, BlockByHeight) {
  $scope.global = Global;
  $scope.loading = false;

  if ($routeParams.blockHeight) {
    BlockByHeight.get({
      blockHeight: $routeParams.blockHeight
    }, function(hash) {
      $location.path('/block/' + hash.blockHash);
    }, function() {
      $rootScope.flashMessage = 'Bad Request';
      $location.path('/');
    });
  }

  //Datepicker
  var _formatTimestamp = function (date) {
    var yyyy = date.getUTCFullYear().toString();
    var mm = (date.getUTCMonth() + 1).toString(); // getMonth() is zero-based
    var dd  = date.getUTCDate().toString();

    return yyyy + '-' + (mm[1] ? mm : '0' + mm[0]) + '-' + (dd[1] ? dd : '0' + dd[0]); //padding
  };

  $scope.$watch('dt', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $location.path('/blocks-date/' + _formatTimestamp(newValue));
    }
  });

  $scope.openCalendar = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.opened = true;
  };

  $scope.humanSince = function(time) {
    var m = moment.unix(time).startOf('day');
    var b = moment().startOf('day');
    return m.max().from(b);
  };


  $scope.list = function() {
    $scope.loading = true;

    if ($routeParams.blockDate) {
      $scope.detail = 'On ' + $routeParams.blockDate;
    }

    if ($routeParams.startTimestamp) {
      var d=new Date($routeParams.startTimestamp*1000);
      var m=d.getMinutes();
      if (m<10) m = '0' + m;
      $scope.before = ' before ' + d.getHours() + ':' + m;
    }

    $rootScope.titleDetail = $scope.detail;

    Blocks.get({
      blockDate: $routeParams.blockDate,
      startTimestamp: $routeParams.startTimestamp
    }, function(res) {
      $scope.loading = false;
      $scope.blocks = res.blocks;
      $scope.pagination = res.pagination;
    });
  };

  $scope.findOne = function() {
    $scope.loading = true;

    Block.get({
      blockHash: $routeParams.blockHash
    }, function(block) {
      $rootScope.titleDetail = block.height;
      $rootScope.flashMessage = null;
      $scope.loading = false;
      $scope.block = block;
    }, function(e) {
      if (e.status === 400) {
        $rootScope.flashMessage = 'Invalid Transaction ID: ' + $routeParams.txId;
      }
      else if (e.status === 503) {
        $rootScope.flashMessage = 'Backend Error. ' + e.data;
      }
      else {
        $rootScope.flashMessage = 'Block Not Found';
      }
      $location.path('/');
    });
  };

  $scope.params = $routeParams;

});

// Source: public/src/js/controllers/connection.js
angular.module('insight.connection').controller('ConnectionController',
  function($scope, $window, Status, getSocket, PeerSync) {

    // Set initial values
    $scope.apiOnline = true;
    $scope.serverOnline = true;
    $scope.clienteOnline = true;

    var socket = getSocket($scope);

    // Check for the node server connection
    socket.on('connect', function() {
      $scope.serverOnline = true;
      socket.on('disconnect', function() {
        $scope.serverOnline = false;
      });
    });

    // Check for the  api connection
    $scope.getConnStatus = function() {
      PeerSync.get({},
        function(peer) {
          $scope.apiOnline = peer.connected;
          $scope.host = peer.host;
          $scope.port = peer.port;
        },
        function() {
          $scope.apiOnline = false;
        });
    };

    socket.emit('subscribe', 'sync');
    socket.on('status', function(sync) {
      $scope.sync = sync;
      $scope.apiOnline = (sync.status !== 'aborted' && sync.status !== 'error');
    });

    // Check for the client conneciton
    $window.addEventListener('offline', function() {
      $scope.$apply(function() {
        $scope.clienteOnline = false;
      });
    }, true);

    $window.addEventListener('online', function() {
      $scope.$apply(function() {
        $scope.clienteOnline = true;
      });
    }, true);

  });

// Source: public/src/js/controllers/currency.js
angular.module('insight.currency').controller('CurrencyController',
  function($scope, $rootScope, Currency) {
    $rootScope.currency.symbol = defaultCurrency;

    var _roundFloat = function(x, n) {
      if(!parseInt(n, 10) || !parseFloat(x)) n = 0;

      return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
    };

    $rootScope.currency.getConvertion = function(value) {
      value = value * 1; // Convert to number

      if (!isNaN(value) && typeof value !== 'undefined' && value !== null) {
        if (value === 0.00000000) return '0 ' + this.symbol; // fix value to show

        var response;

        if (this.symbol === 'USD') {
          response = _roundFloat((value * this.factor), 2);
        } else if (this.symbol === 'mBTCD') {
          this.factor = 1000;
          response = _roundFloat((value * this.factor), 5);
        } else if (this.symbol === 'bits') {
          this.factor = 1000000;
          response = _roundFloat((value * this.factor), 2);
        } else {
          this.factor = 1;
          response = value;
        }
        // prevent sci notation
        if (response < 1e-7) response=response.toFixed(8);

        return response + ' ' + this.symbol;
      }

      return 'value error';
    };

    $scope.setCurrency = function(currency) {
      $rootScope.currency.symbol = currency;
      localStorage.setItem('insight-currency', currency);

      if (currency === 'USD') {
        Currency.get({}, function(res) {
          $rootScope.currency.factor = $rootScope.currency.bitstamp = res.data.bitstamp;
        });
      } else if (currency === 'mBTCD') {
        $rootScope.currency.factor = 1000;
      } else if (currency === 'bits') {
        $rootScope.currency.factor = 1000000;
      } else {
        $rootScope.currency.factor = 1;
      }
    };

    // Get initial value
    Currency.get({}, function(res) {
      $rootScope.currency.factor = $rootScope.currency.bitstamp = res.data.bitstamp;
    });

  });

// Source: public/src/js/controllers/footer.js
angular.module('insight.system').controller('FooterController',
  function($scope, $route, $templateCache, gettextCatalog, amMoment,  Version) {

    $scope.defaultLanguage = defaultLanguage;

    var _getVersion = function() {
      Version.get({},
        function(res) {
          $scope.version = res.version;
        });
    };

    $scope.version = _getVersion();

    $scope.availableLanguages = [{
      name: 'Bengali',
      isoCode: 'bn',
    }, {
      name: 'Deutsch',
      isoCode: 'de_DE',
    }, {
      name: 'English',
      isoCode: 'en',
    }, {
      name: 'Hindi',
      isoCode: 'in',
    }, {
      name: 'Spanish',
      isoCode: 'es',
    }, {
      name: 'Japanese',
      isoCode: 'ja',
    }];

    $scope.setLanguage = function(isoCode) {
      gettextCatalog.currentLanguage = $scope.defaultLanguage = defaultLanguage = isoCode;
      amMoment.changeLocale(isoCode);
      localStorage.setItem('insight-language', isoCode);
      var currentPageTemplate = $route.current.templateUrl;
      $templateCache.remove(currentPageTemplate);
      $route.reload();
    };

  });

// Source: public/src/js/controllers/header.js
angular.module('insight.system').controller('HeaderController',
  function($scope, $rootScope, $modal, getSocket, Global, Block) {
    $scope.global = Global;

    $rootScope.currency = {
      factor: 1,
      bitstamp: 0,
      symbol: 'BTCD'
    };

    $scope.menu = [{
      'title': 'Blocks',
      'link': 'blocks'
    }, {
      'title': 'Status',
      'link': 'status'
    }];

    $scope.openScannerModal = function() {
      var modalInstance = $modal.open({
        templateUrl: 'scannerModal.html',
        controller: 'ScannerController'
      });
    };

    var _getBlock = function(hash) {
      Block.get({
        blockHash: hash
      }, function(res) {
        $scope.totalBlocks = res.height;
      });
    };

    var socket = getSocket($scope);
    socket.on('connect', function() {
      socket.emit('subscribe', 'inv');

      socket.on('block', function(block) {
        var blockHash = block.toString();
        _getBlock(blockHash);
      });
    });

    $rootScope.isCollapsed = true;
  });

// Source: public/src/js/controllers/index.js
var TRANSACTION_DISPLAYED = 10;
var BLOCKS_DISPLAYED = 5;

angular.module('insight.system').controller('IndexController',
  function($scope, Global, getSocket, Blocks) {
    $scope.global = Global;

    var _getBlocks = function() {
      Blocks.get({
        limit: BLOCKS_DISPLAYED
      }, function(res) {
        $scope.blocks = res.blocks;
        $scope.blocksLength = res.length;
      });
    };

    var socket = getSocket($scope);

    var _startSocket = function() { 
      socket.emit('subscribe', 'inv');
      socket.on('tx', function(tx) {
        $scope.txs.unshift(tx);
        if (parseInt($scope.txs.length, 10) >= parseInt(TRANSACTION_DISPLAYED, 10)) {
          $scope.txs = $scope.txs.splice(0, TRANSACTION_DISPLAYED);
        }
      });

      socket.on('block', function() {
        _getBlocks();
      });
    };

    socket.on('connect', function() {
      _startSocket();
    });



    $scope.humanSince = function(time) {
      var m = moment.unix(time);
      return m.max().fromNow();
    };

    $scope.index = function() {
      _getBlocks();
      _startSocket();
    };

    $scope.txs = [];
    $scope.blocks = [];
  });

// Source: public/src/js/controllers/messages.js
angular.module('insight.messages').controller('VerifyMessageController',
  function($scope, $http) {
  $scope.message = {
    address: '',
    signature: '',
    message: ''
  };
  $scope.verification = {
    status: 'unverified',  // ready|loading|verified|error
    result: null,
    error: null,
    address: ''
  };

  $scope.verifiable = function() {
    return ($scope.message.address
            && $scope.message.signature
            && $scope.message.message);
  };
  $scope.verify = function() {
    $scope.verification.status = 'loading';
    $scope.verification.address = $scope.message.address;
    $http.post('/api/messages/verify', $scope.message)
      .success(function(data, status, headers, config) {
        if(typeof(data.result) != 'boolean') {
          // API returned 200 but result was not true or false
          $scope.verification.status = 'error';
          $scope.verification.error = null;
          return;
        }

        $scope.verification.status = 'verified';
        $scope.verification.result = data.result;
      })
      .error(function(data, status, headers, config) {
        $scope.verification.status = 'error';
        $scope.verification.error = data;
      });
  };

  // Hide the verify status message on form change
  var unverify = function() {
    $scope.verification.status = 'unverified';
  };
  $scope.$watch('message.address', unverify);
  $scope.$watch('message.signature', unverify);
  $scope.$watch('message.message', unverify);
});

// Source: public/src/js/controllers/scanner.js
angular.module('insight.system').controller('ScannerController',
  function($scope, $rootScope, $modalInstance, Global) {
    $scope.global = Global;

    // Detect mobile devices
    var isMobile = {
      Android: function() {
          return navigator.userAgent.match(/Android/i);
      },
      BlackBerry: function() {
          return navigator.userAgent.match(/BlackBerry/i);
      },
      iOS: function() {
          return navigator.userAgent.match(/iPhone|iPad|iPod/i);
      },
      Opera: function() {
          return navigator.userAgent.match(/Opera Mini/i);
      },
      Windows: function() {
          return navigator.userAgent.match(/IEMobile/i);
      },
      any: function() {
          return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
      }
    };

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    $scope.isMobile = isMobile.any();
    $scope.scannerLoading = false;

    var $searchInput = angular.element(document.getElementById('search')),
        cameraInput,
        video,
        canvas,
        $video,
        context,
        localMediaStream;

    var _scan = function(evt) {
      if ($scope.isMobile) {
        $scope.scannerLoading = true;
        var files = evt.target.files;

        if (files.length === 1 && files[0].type.indexOf('image/') === 0) {
          var file = files[0];

          var reader = new FileReader();
          reader.onload = (function(theFile) {
            return function(e) {
              var mpImg = new MegaPixImage(file);
              mpImg.render(canvas, { maxWidth: 200, maxHeight: 200, orientation: 6 });

              setTimeout(function() {
                qrcode.width = canvas.width;
                qrcode.height = canvas.height;
                qrcode.imagedata = context.getImageData(0, 0, qrcode.width, qrcode.height);

                try {
                  //alert(JSON.stringify(qrcode.process(context)));
                  qrcode.decode();
                } catch (e) {
                  alert(e);
                }
              }, 1500);
            };
          })(file);

          // Read  in the file as a data URL
          reader.readAsDataURL(file);
        }
      } else {
        if (localMediaStream) {
          context.drawImage(video, 0, 0, 300, 225);

          try {
            qrcode.decode();
          } catch(e) {
            //qrcodeError(e);
          }
        }

        setTimeout(_scan, 500);
      }
    };

    var _successCallback = function(stream) {
      video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
      localMediaStream = stream;
      video.play();
      setTimeout(_scan, 1000);
    };

    var _scanStop = function() {
      $scope.scannerLoading = false;
      $modalInstance.close();
      if (!$scope.isMobile) {
        if (localMediaStream.stop) localMediaStream.stop();
        localMediaStream = null;
        video.src = '';
      }
    };

    var _videoError = function(err) {
      console.log('Video Error: ' + JSON.stringify(err));
      _scanStop();
    };

    qrcode.callback = function(data) {
      _scanStop();

      var str = (data.indexOf('BitcoinDark:') === 0) ? data.substring(8) : data; 
      console.log('QR code detected: ' + str);
      $searchInput
        .val(str)
        .triggerHandler('change')
        .triggerHandler('submit');
    };

    $scope.cancel = function() {
      _scanStop();
    };

    $modalInstance.opened.then(function() {
      $rootScope.isCollapsed = true;
      
      // Start the scanner
      setTimeout(function() {
        canvas = document.getElementById('qr-canvas');
        context = canvas.getContext('2d');

        if ($scope.isMobile) {
          cameraInput = document.getElementById('qrcode-camera');
          cameraInput.addEventListener('change', _scan, false);
        } else {
          video = document.getElementById('qrcode-scanner-video');
          $video = angular.element(video);
          canvas.width = 300;
          canvas.height = 225;
          context.clearRect(0, 0, 300, 225);

          navigator.getUserMedia({video: true}, _successCallback, _videoError); 
        }
      }, 500);
    });
});

// Source: public/src/js/controllers/search.js
angular.module('insight.search').controller('SearchController',
  function($scope, $routeParams, $location, $timeout, Global, Block, Transaction, Address, BlockByHeight) {
  $scope.global = Global;
  $scope.loading = false;

  var _badQuery = function() {
    $scope.badQuery = true;

    $timeout(function() {
      $scope.badQuery = false;
    }, 2000);
  };

  var _resetSearch = function() {
    $scope.q = '';
    $scope.loading = false;
  };

  $scope.search = function() {
    var q = $scope.q;
    $scope.badQuery = false;
    $scope.loading = true;

    Block.get({
      blockHash: q
    }, function() {
      _resetSearch();
      $location.path('block/' + q);
    }, function() { //block not found, search on TX
      Transaction.get({
        txId: q
      }, function() {
        _resetSearch();
        $location.path('tx/' + q);
      }, function() { //tx not found, search on Address
        Address.get({
          addrStr: q
        }, function() {
          _resetSearch();
          $location.path('address/' + q);
        }, function() { // block by height not found
          if (isFinite(q)) { // ensure that q is a finite number. A logical height value.
            BlockByHeight.get({
              blockHeight: q
            }, function(hash) {
              _resetSearch();
              $location.path('/block/' + hash.blockHash);
            }, function() { //not found, fail :(
              $scope.loading = false;
              _badQuery();
            });
          }
          else {
            $scope.loading = false;
            _badQuery();
          }
        });
      });
    });
  };

});

// Source: public/src/js/controllers/status.js
angular.module('insight.status').controller('StatusController',
  function($scope, $routeParams, $location, Global, Status, Sync, getSocket) {
    $scope.global = Global;

    $scope.getStatus = function(q) {
      Status.get({
          q: 'get' + q
        },
        function(d) {
          $scope.loaded = 1;
          angular.extend($scope, d);
        },
        function(e) {
          $scope.error = 'API ERROR: ' + e.data;
        });
    };

    $scope.humanSince = function(time) {
      var m = moment.unix(time / 1000);
      return m.max().fromNow();
    };

    var _onSyncUpdate = function(sync) {
      $scope.sync = sync;
    };

    var _startSocket = function () {
      socket.emit('subscribe', 'sync');
      socket.on('status', function(sync) {
        _onSyncUpdate(sync);
      });
    };
    
    var socket = getSocket($scope);
    socket.on('connect', function() {
      _startSocket();
    });


    $scope.getSync = function() {
      _startSocket();
      Sync.get({},
        function(sync) {
          _onSyncUpdate(sync);
        },
        function(e) {
          var err = 'Could not get sync information' + e.toString();
          $scope.sync = {
            error: err
          };
        });
    };
  });

// Source: public/src/js/controllers/transactions.js
angular.module('insight.transactions').controller('transactionsController',
function($scope, $rootScope, $routeParams, $location, Global, Transaction, TransactionsByBlock, TransactionsByAddress) {
  $scope.global = Global;
  $scope.loading = false;
  $scope.loadedBy = null;

  var pageNum = 0;
  var pagesTotal = 1;
  var COIN = 100000000;

  var _aggregateItems = function(items) {
    if (!items) return [];

    var l = items.length;

    var ret = [];
    var tmp = {};
    var u = 0;

    for(var i=0; i < l; i++) {

      var notAddr = false;
      // non standard input
      if (items[i].scriptSig && !items[i].addr) {
        items[i].addr = 'Unparsed address [' + u++ + ']';
        items[i].notAddr = true;
        notAddr = true;
      }

      // non standard output
      if (items[i].scriptPubKey && !items[i].scriptPubKey.addresses) {
        items[i].scriptPubKey.addresses = ['Unparsed address [' + u++ + ']'];
        items[i].notAddr = true;
        notAddr = true;
      }

      // multiple addr at output
      if (items[i].scriptPubKey && items[i].scriptPubKey.addresses.length > 1) {
        items[i].addr = items[i].scriptPubKey.addresses.join(',');
        ret.push(items[i]);
        continue;
      }

      var addr = items[i].addr || (items[i].scriptPubKey && items[i].scriptPubKey.addresses[0]);

      if (!tmp[addr]) {
        tmp[addr] = {};
        tmp[addr].valueSat = 0;
        tmp[addr].count = 0;
        tmp[addr].addr = addr;
        tmp[addr].items = [];
      }
      tmp[addr].isSpent = items[i].spentTxId;

      tmp[addr].doubleSpentTxID = tmp[addr].doubleSpentTxID   || items[i].doubleSpentTxID;
      tmp[addr].doubleSpentIndex = tmp[addr].doubleSpentIndex || items[i].doubleSpentIndex;
      tmp[addr].unconfirmedInput += items[i].unconfirmedInput;
      tmp[addr].dbError = tmp[addr].dbError || items[i].dbError;
      tmp[addr].valueSat += Math.round(items[i].value * COIN);
      tmp[addr].items.push(items[i]);
      tmp[addr].notAddr = notAddr;
      tmp[addr].count++;
    }

    angular.forEach(tmp, function(v) {
      v.value    = v.value || parseInt(v.valueSat) / COIN;
      ret.push(v);
    });
    return ret;
  };

  var _processTX = function(tx) {
    tx.vinSimple = _aggregateItems(tx.vin);
    tx.voutSimple = _aggregateItems(tx.vout);
  };

  var _paginate = function(data) {
    $scope.loading = false;

    pagesTotal = data.pagesTotal;
    pageNum += 1;

    data.txs.forEach(function(tx) {
      _processTX(tx);
      $scope.txs.push(tx);
    });
  };

  var _byBlock = function() {
    TransactionsByBlock.get({
      block: $routeParams.blockHash,
      pageNum: pageNum
    }, function(data) {
      _paginate(data);
    });
  };

  var _byAddress = function () {
    TransactionsByAddress.get({
      address: $routeParams.addrStr,
      pageNum: pageNum
    }, function(data) {
      _paginate(data);
    });
  };

  var _findTx = function(txid) {
    Transaction.get({
      txId: txid
    }, function(tx) {
      $rootScope.titleDetail = tx.txid.substring(0,7) + '...';
      $rootScope.flashMessage = null;
      $scope.tx = tx;
      _processTX(tx);
      $scope.txs.unshift(tx);
    }, function(e) {
      if (e.status === 400) {
        $rootScope.flashMessage = 'Invalid Transaction ID: ' + $routeParams.txId;
      }
      else if (e.status === 503) {
        $rootScope.flashMessage = 'Backend Error. ' + e.data;
      }
      else {
        $rootScope.flashMessage = 'Transaction Not Found';
      }

      $location.path('/');
    });
  };

  $scope.findThis = function() {
    _findTx($routeParams.txId);
  };

  //Initial load
  $scope.load = function(from) {
    $scope.loadedBy = from;
    $scope.loadMore();
  };

  //Load more transactions for pagination
  $scope.loadMore = function() {
    if (pageNum < pagesTotal && !$scope.loading) {
      $scope.loading = true;

      if ($scope.loadedBy === 'address') {
        _byAddress();
      }
      else {
        _byBlock();
      }
    }
  };

  // Highlighted txout
  if ($routeParams.v_type == '>' || $routeParams.v_type == '<') {
    $scope.from_vin = $routeParams.v_type == '<' ? true : false;
    $scope.from_vout = $routeParams.v_type == '>' ? true : false;
    $scope.v_index = parseInt($routeParams.v_index);
    $scope.itemsExpanded = true;
  }
  
  //Init without txs
  $scope.txs = [];

  $scope.$on('tx', function(event, txid) {
    _findTx(txid);
  });

});

angular.module('insight.transactions').controller('SendRawTransactionController',
  function($scope, $http) {
  $scope.transaction = '';
  $scope.status = 'ready';  // ready|loading|sent|error
  $scope.txid = '';
  $scope.error = null;

  $scope.formValid = function() {
    return !!$scope.transaction;
  };
  $scope.send = function() {
    var postData = {
      rawtx: $scope.transaction
    };
    $scope.status = 'loading';
    $http.post('/api/tx/send', postData)
      .success(function(data, status, headers, config) {
        if(typeof(data.txid) != 'string') {
          // API returned 200 but the format is not known
          $scope.status = 'error';
          $scope.error = 'The transaction was sent but no transaction id was got back';
          return;
        }

        $scope.status = 'sent';
        $scope.txid = data.txid;
      })
      .error(function(data, status, headers, config) {
        $scope.status = 'error';
        if(data) {
          $scope.error = data;
        } else {
          $scope.error = "No error message given (connection error?)"
        }
      });
  };
});

// Source: public/src/js/services/address.js
angular.module('insight.address').factory('Address',
  function($resource) {
  return $resource('/api/addr/:addrStr/?noTxList=1', {
    addrStr: '@addStr'
  }, {
    get: {
      method: 'GET',
      interceptor: {
        response: function (res) {
          return res.data;
        },
        responseError: function (res) {
          if (res.status === 404) {
            return res;
          }
        }
      }
    }
  });
});


// Source: public/src/js/services/blocks.js
angular.module('insight.blocks')
  .factory('Block',
    function($resource) {
    return $resource('/api/block/:blockHash', {
      blockHash: '@blockHash'
    }, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })
  .factory('Blocks',
    function($resource) {
      return $resource('/api/blocks');
  })
  .factory('BlockByHeight',
    function($resource) {
      return $resource('/api/block-index/:blockHeight');
  });

// Source: public/src/js/services/currency.js
angular.module('insight.currency').factory('Currency',
  function($resource) {
    return $resource('/api/currency');
});

// Source: public/src/js/services/global.js
//Global service for global variables
angular.module('insight.system')
  .factory('Global',[
    function() {
    }
  ])
  .factory('Version',
    function($resource) {
      return $resource('/api/version');
  });

// Source: public/src/js/services/socket.js
var ScopedSocket = function(socket, $rootScope) {
  this.socket = socket;
  this.$rootScope = $rootScope;
  this.listeners = [];
};

ScopedSocket.prototype.removeAllListeners = function(opts) {
  if (!opts) opts = {};
  for (var i = 0; i < this.listeners.length; i++) {
    var details = this.listeners[i];
    if (opts.skipConnect && details.event === 'connect') {
      continue;
    }
    this.socket.removeListener(details.event, details.fn);
  }
  this.listeners = [];
};

ScopedSocket.prototype.on = function(event, callback) {
  var socket = this.socket;
  var $rootScope = this.$rootScope;

  var wrapped_callback = function() {
    var args = arguments;
    $rootScope.$apply(function() {
      callback.apply(socket, args);
    });
  };
  socket.on(event, wrapped_callback);

  this.listeners.push({
    event: event,
    fn: wrapped_callback
  });
};

ScopedSocket.prototype.emit = function(event, data, callback) {
  var socket = this.socket;
  var $rootScope = this.$rootScope;

  socket.emit(event, data, function() {
    var args = arguments;
    $rootScope.$apply(function() {
      if (callback) {
        callback.apply(socket, args);
      }
    });
  });
};

angular.module('insight.socket').factory('getSocket',
  function($rootScope) {
    var socket = io.connect(null, {
      'reconnect': true,
      'reconnection delay': 500,
    });
    return function(scope) {
      var scopedSocket = new ScopedSocket(socket, $rootScope);
      scope.$on('$destroy', function() {
        scopedSocket.removeAllListeners();
      });
      socket.on('connect', function() {
        scopedSocket.removeAllListeners({
          skipConnect: true
        });
      });
      return scopedSocket;
    };
  });

// Source: public/src/js/services/status.js
angular.module('insight.status')
  .factory('Status',
    function($resource) {
      return $resource('/api/status', {
        q: '@q'
      });
    })
  .factory('Sync',
    function($resource) {
      return $resource('/api/sync');
    })
  .factory('PeerSync',
    function($resource) {
      return $resource('/api/peer');
    });

// Source: public/src/js/services/transactions.js
angular.module('insight.transactions')
  .factory('Transaction',
    function($resource) {
    return $resource('/api/tx/:txId', {
      txId: '@txId'
    }, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })
  .factory('TransactionsByBlock',
    function($resource) {
    return $resource('/api/txs', {
      block: '@block'
    });
  })
  .factory('TransactionsByAddress',
    function($resource) {
    return $resource('/api/txs', {
      address: '@address'
    });
  })
  .factory('Transactions',
    function($resource) {
      return $resource('/api/txs');
  });

// Source: public/src/js/directives.js
var ZeroClipboard = window.ZeroClipboard;

angular.module('insight')
  .directive('scroll', function ($window) {
    return function(scope, element, attrs) {
      angular.element($window).bind('scroll', function() {
        if (this.pageYOffset >= 200) {
          scope.secondaryNavbar = true;
        } else {
          scope.secondaryNavbar = false;
        }
        scope.$apply();
      });
    };
  })
  .directive('whenScrolled', function($window) {
    return {
      restric: 'A',
      link: function(scope, elm, attr) {
        var pageHeight, clientHeight, scrollPos;
        $window = angular.element($window);

        var handler = function() {
          pageHeight = window.document.documentElement.scrollHeight;
          clientHeight = window.document.documentElement.clientHeight;
          scrollPos = window.pageYOffset;

          if (pageHeight - (scrollPos + clientHeight) === 0) {
            scope.$apply(attr.whenScrolled);
          }
        };

        $window.on('scroll', handler);

        scope.$on('$destroy', function() {
          return $window.off('scroll', handler);
        });
      }
    };
  })
  .directive('clipCopy', function() {
    ZeroClipboard.config({
      moviePath: '/lib/zeroclipboard/ZeroClipboard.swf',
      trustedDomains: ['*'],
      allowScriptAccess: 'always',
      forceHandCursor: true
    });

    return {
      restric: 'A',
      scope: { clipCopy: '=clipCopy' },
      template: '<div class="tooltip fade right in"><div class="tooltip-arrow"></div><div class="tooltip-inner">Copied!</div></div>',
      link: function(scope, elm) {
        var clip = new ZeroClipboard(elm);

        clip.on('load', function(client) {
          var onMousedown = function(client) {
            client.setText(scope.clipCopy);
          };

          client.on('mousedown', onMousedown);

          scope.$on('$destroy', function() {
            client.off('mousedown', onMousedown);
          });
        });

        clip.on('noFlash wrongflash', function() {
          return elm.remove();
        });
      }
    };
  })
  .directive('focus', function ($timeout) {
    return {
      scope: {
        trigger: '@focus'
      },
      link: function (scope, element) {
        scope.$watch('trigger', function (value) {
          if (value === "true") {
            $timeout(function () {
              element[0].focus();
            });
          }
        });
      }
    };
  });

// Source: public/src/js/filters.js
angular.module('insight')
  .filter('startFrom', function() {
    return function(input, start) {
      start = +start; //parse to int
      return input.slice(start);
    }
  })
  .filter('split', function() {
    return function(input, delimiter) {
      var delimiter = delimiter || ',';
      return input.split(delimiter);
    }
  });

// Source: public/src/js/config.js
//Setting up route
angular.module('insight').config(function($routeProvider) {
  $routeProvider.
    when('/block/:blockHash', {
      templateUrl: '/views/block.html',
      title: 'BitcoinDark Block '
    }).
    when('/block-index/:blockHeight', {
      controller: 'BlocksController',
      templateUrl: '/views/redirect.html'
    }).
    when('/tx/send', {
      templateUrl: '/views/transaction_sendraw.html',
      title: 'Broadcast Raw Transaction'
    }).
    when('/tx/:txId/:v_type?/:v_index?', {
      templateUrl: '/views/transaction.html',
      title: 'BitcoinDark Transaction '
    }).
    when('/', {
      templateUrl: '/views/index.html',
      title: 'Home'
    }).
    when('/blocks', {
      templateUrl: '/views/block_list.html',
      title: 'BitcoinDark Blocks found Today'
    }).
    when('/blocks-date/:blockDate/:startTimestamp?', {
      templateUrl: '/views/block_list.html',
      title: 'BitcoinDark Blocks found '
    }).
    when('/address/:addrStr', {
      templateUrl: '/views/address.html',
      title: 'BitcoinDark Address '
    }).
    when('/status', {
      templateUrl: '/views/status.html',
      title: 'Status'
    }).
    when('/messages/verify', {
      templateUrl: '/views/messages_verify.html',
      title: 'Verify Message'
    })
    .otherwise({
      templateUrl: '/views/404.html',
      title: 'Error'
    });
});

//Setting HTML5 Location Mode
angular.module('insight')
  .config(function($locationProvider) {
    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('!');
  })
  .run(function($rootScope, $route, $location, $routeParams, $anchorScroll, ngProgress, gettextCatalog, amMoment) {
    gettextCatalog.currentLanguage = defaultLanguage;
    amMoment.changeLocale(defaultLanguage);
    $rootScope.$on('$routeChangeStart', function() {
      ngProgress.start();
    });

    $rootScope.$on('$routeChangeSuccess', function() {
      ngProgress.complete();

      //Change page title, based on Route information
      $rootScope.titleDetail = '';
      $rootScope.title = $route.current.title;
      $rootScope.isCollapsed = true;
      $rootScope.currentAddr = null;

      $location.hash($routeParams.scrollTo);
      $anchorScroll();
    });
  });

// Source: public/src/js/init.js
angular.element(document).ready(function() {
  // Init the app
  // angular.bootstrap(document, ['insight']);
});

// Source: public/src/js/translations.js
angular.module('insight').run(['gettextCatalog', function (gettextCatalog) {
/* jshint -W100 */
    gettextCatalog.setStrings('bn', {"(Input unconfirmed)":"(ইনপুট অনিশ্চিত)","404 Page not found :(":"৪০৪ পৃষ্ঠা পাওয়া যায়নি :(","<strong>ExploreBTCD</strong>  is an open-source BitcoinDark blockchain explorer with REST and websocket API. You can search for any BTCD address, block, transaction. Simply enter your query in the search box and hit enter.":"<strong>ExploreBTCD</strong> REST ও WebSocket API সাথে সম্মিলিত একটি ওপেন সোর্স BitcoinDark blockchain এক্সপ্লোরার। আপনি যে কোনো BTCD ঠিকানা, ব্লক, লেনদেনের জন্য অনুসন্ধান করতে পারেন। শুধুমাত্র সার্চ বক্সে আপনার প্রশ্ন লিখুন এবং এন্টার চাপুন।","If you see any issue or have a feedback, tweet":"আপনি যদি কোন সমস্যা বা ত্রুটি দেখতে পান, দয়া করে Tweet করুন @explorebtcd","<strong>Donations</strong> are welcome:":"<strong>অনুদান</strong> স্বাগতম","About":"কিছু কথা","Address":"ঠিকানা","Age":"সময়","Application Status":"অ্যাপ্লিকেশনের অবস্থা","Best Block":"সেরা ব্লক","BitcoinDark node information":"BitcoinDark নোড তথ্য","Block":"ব্লক","Block Reward":"ব্লক পুরস্কার","Blocks":"ব্লক","Bytes Serialized":"বাইট ধারাবাহিকতা","Can't connect to BitcoinDarkd to get live updates from the p2p network. (Tried connecting to BitcoinDarkd at {{host}}:{{port}} and failed.)":"P2P নেটওয়ার্ক থেকে লাইভ আপডেট পেতে BitcoinDarkd সাথে সংযোগ করা যাচ্ছে না . {{host}}:{{port}} এ BitcoinDarkd'র সাথে সংযোগের চেষ্টা করা হয়েছে এবং তা ব্যর্থ হয়েছে।)","Can't connect to ExploreBTCD server. Attempting to reconnect...":"ExploreBTCD সার্ভারের সাথে সংযোগ করা যাচ্ছে না. পুনরায় সংযোগ স্থাপনের চেষ্টা করা হচ্ছে...","Can't connect to internet. Please, check your connection.":"ইন্টারনেটের সাথে সংযোগ স্থাপন করা যায়নি। আপনার সংযোগ চেক করুন।","Complete":"সম্পন্ন হয়েছে","Confirmations":"নিশ্চয়তা","Supply":"যোগান","Nodes Connected":"সংযুক্ত নোডের সংখ্যা","Current Blockchain Tip (ExploreBTCD)":"বর্তমান Blockchain টিপ (ExploreBTCD)","Current Sync Status":"সিঙ্কের বর্তমান অবস্থা","Details":"বিস্তারিত","Difficulty":"কঠিনতা","Double spent attempt detected. From tx:":"ডাবল ব্যয় প্রচেষ্টা সনাক্ত করা হয়েছে. TX থেকে:","Error!":"ত্রুটি!","Fee":"খরচ","Final Balance":"চূড়ান্ত ব্যালেন্স","Finish Date":"শেষ হবার তারিখ","Go to home":"হোমপেজে যান","Hash Serialized":"হ্যাশের ধারাবাহিকতা","Height":"উচ্চতা","Included in Block":"ব্লকের মধ্যে অন্তর্ভুক্ত","Incoherence in levelDB detected:":"LevelDB'র মধ্যে বিচ্ছিন্নতা সনাক্ত হয়েছে:","Info Errors":"তথ্য ত্রুটি","Initial Block Chain Height":"সর্বশেষ ব্লক চেইন উচ্চতা","Input":"ইনপুট","Last Block":"সর্বশেষ ব্লক","Last Block Hash (BitcoinDarkd)":"সর্বশেষ ব্লক হ্যাশ (BitcoinDarkd)","Latest Blocks":"সর্বশেষ ব্লকসমূহ","Latest Transactions":"সর্বশেষ লেনদেন","Loading Address Information":"ঠিকানার তথ্য লোড হচ্ছে","Loading Block Information":"ব্লকের তথ্য লোড হচ্ছে","Loading Selected Date...":"নির্বাচিত তারিখ লোড হচ্ছে ...","Loading Transaction Details":"লেনদেনের বিবরণ লোড হচ্ছে","Loading Transactions...":"লেনদেন লোড হচ্ছে ...","Loading...":"লোড হচ্ছে ...","Block Time":"ব্লকের সময়","PoS Block":"PoS ব্লক","Found by":"অনুসন্ধানদাতা","PoS Difficulty":"PoS কঠিনতা","PoW Difficulty":"PoW কঠিনতা","Total Supply":"মোট সরবরাহ","Next Block":"পরবর্তী ব্লক","No Inputs (Newly Generated Coins)":"কোন ইনপুট নেই (নতুন জন্ম নেয়া মুদ্রা)","No blocks yet.":"এখনও কোন ব্লক নেই।","No matching records found!":"কোন মানানসই রেকর্ড পাওয়া যায় নি!","No. Transactions":"লেনদেন নং","Number Of Transactions":"লেনদেনের সংখ্যা","Output":"আউটপুট","Previous Block":"পূর্ববর্তী ব্লক","Protocol version":"প্রোটোকল সংস্করণ","Proxy setting":"প্রক্সি সেটিং","Received Time":"গৃহীত সময়","Redirecting...":"পুনঃনিরধারিত পথে নিয়ে যাওয়া হচ্ছে...","Search for block, transaction or address":"ব্লক, লেনদেন বা ঠিকানা অনুসন্ধান করুন","See all blocks":"সমস্ত ব্লক দেখুন","Show Transaction Output data":"লেনদেনের আউটপুট তথ্য দেখান","Show all":"সব দেখান","Show input":"ইনপুট দেখান","Show less":"কম দেখান","Show more":"আরও দেখান","Size":"আকার","Size (bytes)":"আকার (বাইট)","Skipped Blocks (previously synced)":"এরিয়ে যাওয়া ব্লক (পূর্বে সিঙ্ক করা)","Start Date":"শুরু করার তারিখ","Status":"অবস্থা","Summary":"সারাংশ","Summary <small>confirmed</small>":"সারাংশ <small>নিশ্চিত</small>","Sync Progress":"সিঙ্কের অগ্রগতি","Sync Status":"সিঙ্কের অবস্থা","Sync Type":"সিঙ্কের প্রকার","Synced Blocks":"সিঙ্ক করা ব্লক","Testnet":"টেস্ট নেট","There are no transactions involving this address.":"এই ঠিকানার সাথে জড়িত আর কোন লেনদেন নেই","Time Offset":"সময় নির্ধারন","Timestamp":"টাইমস্ট্যাম্প","Today":"আজ","Total Amount":"মোট পরিমাণ","Total Received":"মোট গৃহীত","Total Sent":"মোট প্রেরিত","Transaction":"লেনদেন","Transaction Output Set Information":"লেনদেনের আউটপুট তথ্য সেট","Transaction Outputs":"লেনদেনের আউটপুটসমূহ","Transactions":"লেনদেনসমূহ","Type":"প্রকার","Unconfirmed":"অনিশ্চিত","Unconfirmed Transaction!":"অনিশ্চিত লেনদেন!","Unconfirmed Txs Balance":"অনিশ্চিত Txs ব্যালেন্স","Value Out":"অর্থমূল্য","Version":"সংস্করণ","Waiting for blocks...":"ব্লকের জন্য অপেক্ষা করা হচ্ছে ...","Waiting for transactions...":"লেনদেনের জন্য অপেক্ষা করা হচ্ছে ...","by date.":"তারিখ।","first seen at":"প্রথম দেখা গেছে","Block Type":"ব্লকের প্রকার","created at":"নির্মিত","found on:":"পাওয়া গেছে:","Waiting for blocks":"Esperando bloques"});
    gettextCatalog.setStrings('de_DE', {"(Input unconfirmed)":"(Eingabe unbestätigt)","404 Page not found :(":"404 Seite nicht gefunden :(","About":"Über insight","Address":"Adresse","Age":"Alter","Application Status":"Programmstatus","Best Block":"Bester Block","BitcoinDark node information":"BitcoinDark-Node Info","Block":"Block","Block Reward":"Belohnung","Blocks":"Blöcke","Status":"Status","Bytes Serialized":"Serialisierte Bytes","Can't connect to bitcoind to get live updates from the p2p network. (Tried connecting to bitcoind at {{host}}:{{port}} and failed.)":"Es ist nicht möglich mit Bitcoind zu verbinden um live Aktualisierungen vom P2P Netzwerk zu erhalten. (Verbindungsversuch zu bitcoind an {{host}}:{{port}} ist fehlgeschlagen.)","Can't connect to insight server. Attempting to reconnect...":"Keine Verbindung zum insight-Server möglich. Es wird versucht die Verbindung neu aufzubauen...","Can't connect to internet. Please, check your connection.":"Keine Verbindung zum Internet möglich, bitte Zugangsdaten prüfen.","Complete":"Vollständig","Confirmations":"Bestätigungen","Conn":"Verbindungen","Connections to other nodes":"Verbindungen zu Nodes","Current Blockchain Tip (ExploreBTCD)":"Aktueller Blockchain Tip (ExploreBTCD)","Current Sync Status":"Aktueller Status","Nodes Connected":"Knoten verbunden","Details":"Details","Difficulty":"Schwierigkeit","Double spent attempt detected. From tx:":"Es wurde ein \"double Spend\" Versuch erkannt.Von tx:","Error!":"Fehler!","Fee":"Gebühr","Reward":"Belohnung","Final Balance":"Schlussbilanz","Finish Date":"Fertigstellung","Go to home":"Zur Startseite","Hash Serialized":"Hash Serialisiert","Height":"Höhe","Supply":"Versorgung","Included in Block":"Eingefügt in Block","Incoherence in levelDB detected:":"Es wurde eine Zusammenhangslosigkeit in der LevelDB festgestellt:","Info Errors":"Fehlerbeschreibung","Initial Block Chain Height":"Ursprüngliche Blockchain Höhe","Input":"Eingänge","Last Block":"Letzter Block","Last Block Hash (BitcoinDarkd)":"Letzter Hash (BitcoinDarkd)","Latest Blocks":"Letzte Blöcke","Latest Transactions":"Letzte Transaktionen","Loading Address Information":"Lade Adressinformationen","Loading Block Information":"Lade Blockinformation","Loading Selected Date...":"Lade gewähltes Datum...","Loading Transaction Details":"Lade Transaktionsdetails","Loading Transactions...":"Lade Transaktionen...","PoS Block":"PoS Blöcke","PoW Block":"PoW Blöcke","Loading...":"Lade...","Block Time":"Blöckezeit","Found by":"Durch gefunden","PoW Difficulty":"PoW Schwierigkeitgrad","PoS Difficulty":"PoS Schwierigkeitgrad","Total Supply":"Gesamtangebot","Next Block":"Nächster Blöcke","No Inputs (Newly Generated Coins)":"Keine Eingänge (Neu generierte Coins)","No blocks yet.":"Keine Blöcke bisher.","No matching records found!":"Keine passenden Einträge gefunden!","No. Transactions":"Anzahl Transaktionen","Number Of Transactions":"Anzahl der Transaktionen","Output":"Ausgänge","Powered by":"Powered by","Previous Block":"Letzter Block","Protocol version":"Protokollversion","Proxy setting":"Proxyeinstellung","Received Time":"Eingangszeitpunkt","Redirecting...":"Umleitung...","Search for block, transaction or address":"Suche Block, Transaktion oder Adresse","See all blocks":"Alle Blöcke anzeigen","Show Transaction Output data":"Zeige Abgänge","Show all":"Zeige Alles","Show input":"Zeige Eingänge","Show less":"Weniger anzeigen","Show more":"Mehr anzeigen","Size":"Größe","Size (bytes)":"Größe (bytes)","Skipped Blocks (previously synced)":"Verworfene Blöcke (bereits syncronisiert)","Start Date":"Startdatum","Summary":"Zusammenfassung","Summary <small>confirmed</small>":"Zusammenfassung <small>bestätigt</small>","Sync Progress":"Fortschritt","Sync Status":"Syncronisation","Sync Type":"Art der Syncronisation","Synced Blocks":"Syncronisierte Blöcke","Testnet":"Testnet aktiv","There are no transactions involving this address.":"Es gibt keine Transaktionen zu dieser Adressse","Time Offset":"Zeitoffset zu UTC","Timestamp":"Zeitstempel","Today":"Heute","Total Amount":"Gesamtsumme","Total Received":"Insgesamt empfangen","Total Sent":"Insgesamt gesendet","Transaction":"Transaktion","Transaction Output Set Information":"Transaktions Abgänge","Transaction Outputs":"Abgänge","Transactions":"Transaktionen","Type":"Typ","Unconfirmed":"Unbestätigt","Unconfirmed Transaction!":"Unbestätigte Transaktion!","Unconfirmed Txs Balance":"Unbestätigtes Guthaben","Value Out":"Wert","Version":"Version","Waiting for blocks...":"Warte auf Blöcke...","Waiting for transactions...":"Warte auf Transaktionen...","by date.":"nach Datum.","Block Type":"Blöcketyp","first seen at":"zuerst gesehen am","created at":"aufgestellt","found on:":"gefunden:","Waiting for blocks":"Warte auf Blöcke"});
    gettextCatalog.setStrings('es', {"(Input unconfirmed)":"(Entrada sin confirmar)","404 Page not found :(":"404 Página no encontrada :(","<strong>ExploreBTCD</strong>  is an open-source BitcoinDark blockchain explorer with REST and Websocket API. You can search for any BTCD address, block, transaction. Simply enter your query in the search box and hit enter.":"<strong>ExploreBTCD</strong>  es un codigo abierto Bir=tcoinDark explorador blockchain con API REST y WebSocket. Puedes buscar cualquier direccion BTCD, bloque, transaccion. Simplemente introduzca su consulta en el cuadro de busqueda y pulsa enter.","If you see any issue or have a feedback, tweet <a href=\"https://twitter.com/explorebtcd\" target=\"_blank\" rel=\"nofollow\">@explorebtcd</a>":"Si usted ve cualquier problema o tener una retroalimentacion, tweet <a href\"https://twitter.com/explorebtcd\" target=\"_blank\">@explorebtcd</a>","About":"Acerca de","Address":"Dirección","Age":"Edad","Application Status":"Estado de la Aplicación","Best Block":"Mejor Bloque","BitcoinDark node information":"Información del nodo BitcoinDark","Block":"Bloque","Block Reward":"Bloque Recompensa","Blocks":"Bloques","Bytes Serialized":"Bytes Serializados","Can't connect to BitcoinDarkd to get live updates from the p2p network. (Tried connecting to BitcoinDarkd at {{host}}:{{port}} and failed.)":"No se pudo conectar a BitcoinDarkd para obtener actualizaciones en vivo de la red p2p. (Se intentó conectar a BitcoinDarkd de {{host}}:{{port}} y falló.)","Can't connect to insight server. Attempting to reconnect...":"No se pudo conectar al servidor insight. Intentando re-conectar...","Can't connect to internet. Please, check your connection.":"No se pudo conectar a Internet. Por favor, verifique su conexión.","Complete":"Completado","Confirmations":"Confirmaciones","Supply":"Suministro","Nodes Connected":"Nodos Conectados","Current Blockchain Tip (insight)":"Actual Blockchain Tip (insight)","Current Sync Status":"Actual Estado de Sincronización","Details":"Detalles","Difficulty":"Dificultad","Double spent attempt detected. From tx:":"Intento de doble gasto detectado. De la transacción:","Error!":"¡Error!","Fee":"Tasa","Reward":"Recompensa","Final Balance":"Balance Final","Finish Date":"Fecha Final","Go to home":"Volver al Inicio","Hash Serialized":"Hash Serializado","Height":"Altura","Included in Block":"Incluido en el Bloque","Incoherence in levelDB detected:":"Detectada una incoherencia en levelDB:","Info Errors":"Errores de Información","Initial Block Chain Height":"Altura de la Cadena en Bloque Inicial","Input":"Entrada","Last Block":"Último Bloque","Last Block Hash (BitcoinDarkd)":"Último Bloque Hash (BitcoinDarkd)","Latest Blocks":"Últimos Bloques","Latest Transactions":"Últimas Transacciones","Loading Address Information":"Cargando Información de la Dirección","Loading Block Information":"Cargando Información del Bloque","Loading Selected Date...":"Cargando Fecha Seleccionada...","Loading Transaction Details":"Cargando Detalles de la Transacción","Loading Transactions...":"Cargando Transacciones...","Loading...":"Cargando...","Block Time":"Tiempo de Bloque","PoS Block":"Bloque PoS","PoW Block":"Bloque PoW","Found by":"Encontrado por","PoS Difficulty":"Dificultad de PoS","PoW Difficulty":"Dificultad de PoW","Total Supply":"Suministro Total","Next Block":"Próximo Bloque","No Inputs (Newly Generated Coins)":"Sin Entradas (Monedas Recién Generadas)","No blocks yet.":"No hay bloques aún.","No matching records found!":"¡No se encontraron registros coincidentes!","No. Transactions":"Nro. de Transacciones","Number Of Transactions":"Número de Transacciones","Output":"Salida","Powered by":"Funciona con","Previous Block":"Bloque Anterior","Protocol version":"Versión del protocolo","Proxy setting":"Opción de proxy","Received Time":"Hora de Recibido","Redirecting...":"Redireccionando...","Search for block, transaction or address":"Buscar bloques, transacciones o direcciones","See all blocks":"Ver todos los bloques","Show Transaction Output data":"Mostrar dato de Salida de la Transacción","Show all":"Mostrar todos","Show input":"Mostrar entrada","Show less":"Ver menos","Show more":"Ver más","Size":"Tamaño","Size (bytes)":"Tamaño (bytes)","Skipped Blocks (previously synced)":"Bloques Saltados (previamente sincronizado)","Start Date":"Fecha de Inicio","Status":"Estado","Summary":"Resumen","Summary <small>confirmed</small>":"Resumen <small>confirmados</small>","Sync Progress":"Proceso de Sincronización","Sync Status":"Estado de Sincronización","Sync Type":"Tipo de Sincronización","Synced Blocks":"Bloques Sincornizados","Testnet":"Red de prueba","There are no transactions involving this address.":"No hay transacciones para esta dirección","Time Offset":"Desplazamiento de hora","Timestamp":"Fecha y hora","Today":"Hoy","Total Amount":"Cantidad Total","Total Received":"Total Recibido","Total Sent":"Total Enviado","Transaction":"Transacción","Transaction Output Set Information":"Información del Conjunto de Salida de la Transacción","Transaction Outputs":"Salidas de la Transacción","Transactions":"Transacciones","Type":"Tipo","Unconfirmed":"Sin confirmar","Unconfirmed Transaction!":"¡Transacción sin confirmar!","Unconfirmed Txs Balance":"Balance sin confirmar","Value Out":"Valor de Salida","Version":"Versión","Waiting for blocks...":"Esperando bloques...","Waiting for transactions...":"Esperando transacciones...","by date.":"por fecha.","first seen at":"Visto a","Block Type":"Tipo de Bloque","created at":"creado en","found on:":"encont-rados el:","Waiting for blocks":"Esperando bloques"});
    gettextCatalog.setStrings('in', {"(Input unconfirmed)":"(अपुष्ट इनपुट)","404 Page not found :(":"404 पृष्ठ नहीं मिला :(","<strong>ExploreBTCD</strong>  is an open-source BitcoinDark blockchain explorer with REST and websocket API. You can search for any BTCD address, block, transaction. Simply enter your query in the search box and hit enter.":"<strong>ExploreBTCD</strong> REST और websocket API के साथ एक खुला स्रोत BitcoinDark blockchain एक्सप्लोरर है. आप किसी भी BTCD पते, ब्लॉक, लेनदेन के लिए खोज कर सकते हैं. बस खोज बॉक्स में अपनी क्वेरी दर्ज और हिट दर्ज करें.","If you see any issue or have a feedback, tweet":"আপনি যদি কোন সমস্যা বা ত্রুটি দেখতে পান, দয়া করে Tweet করুন @explorebtcd","<strong>Donations</strong> are welcome:":"<strong>অনুদান</strong> স্বাগতম","About":"बारे में","Address":"पता","Age":"आयु","Application Status":"आवेदन की स्थिति","Best Block":"सर्वश्रेष्ठ ब्लॉक","BitcoinDark node information":"BitcoinDark नोड जानकारी","Block":"ब्लॉक","Block Reward":"ब्लॉक पुरस्कार","Blocks":"ब्लाकों","Bytes Serialized":"बाइट्स श्रृंखलाबद्ध","Can't connect to BitcoinDarkd to get live updates from the p2p network. (Tried connecting to BitcoinDarkd at {{host}}:{{port}} and failed.)":"BitcoinDarkd से कनेक्ट नहीं हो P2P नेटवर्क से लाइव अपडेट प्राप्त करने के लिए. ({{host}}:{{port}} पर BitcoinDarkd को जोड़ने की कोशिश की: और विफल रहा है.)","Can't connect to ExploreBTCD server. Attempting to reconnect...":"ExploreBTCD सर्वर से कनेक्ट नहीं कर सकता. फिर से कनेक्ट करने का प्रयास ...","Can't connect to internet. Please, check your connection.":"इंटरनेट से कनेक्ट नहीं कर सकता. , अपने कनेक्शन की जांच करें.","Complete":"पूरा","Confirmations":"पुष्टि","Supply":"आपूर्ति","Nodes Connected":"नोड्स कनेक्टेड","Current Blockchain Tip (ExploreBTCD)":"वर्तमान Blockchain टिप (ExploreBTCD)","Current Sync Status":"वर्तमान सिंक स्थिति","Details":"विवरण","Difficulty":"कठिनाई","Double spent attempt detected. From tx:":"डबल खर्च चेष्टा. tx से:","Error!":"त्रुटि!","Fee":"फ़ीस","Final Balance":"अंतिम शेष","Finish Date":"तारीख खत्म","Go to home":"मुखपृष्ठ पर जाएँ","Hash Serialized":"हैश श्रृंखलाबद्ध","Height":"लंबाई","Included in Block":"ब्लॉक में शामिल","Incoherence in levelDB detected:":"LevelDB में बेतरतीबी का पता चला:","Info Errors":"जानकारी त्रुटियाँ","Initial Block Chain Height":"आरंभिक ब्लॉक चेन लंबाई","Input":"इनपुट","Last Block":"अंतिम ब्लॉक","Last Block Hash (BitcoinDarkd)":"अंतिम ब्लॉक हैश (BitcoinDarkd)","Latest Blocks":"नयी ब्लाकों","Latest Transactions":"नवीनतम लेनदेन","Loading Address Information":"लोड हो रहा है पता जानकारी","Loading Block Information":"ब्लॉक जानकारी लोड","Loading Selected Date...":"चयनित तिथि लोड हो रहा है ...","Loading Transaction Details":"लोड हो लेनदेन विवरण","Loading Transactions...":"लोड हो लेनदेन ...","Loading...":"लोड हो रहा है ...","Block Time":"ब्लॉक समय","PoS Block":"PoS ब्लॉक","Found by":"द्वारा मिला","PoS Difficulty":"PoS कठिनाई","PoW Difficulty":"PoW कठिनाई","Total Supply":"कुल आपूर्ति","Next Block":"अगले ब्लॉक","No Inputs (Newly Generated Coins)":"कोई आदानों (नव सृजित सिक्के)","No blocks yet.":"अभी तक कोई ब्लॉकों.","No matching records found!":"कोई मिलान रिकॉर्ड पाया!","No. Transactions":"सं लेनदेन","Number Of Transactions":"लेनदेन की संख्या","Output":"आउटपुट","Previous Block":"पिछले ब्लॉक","Protocol version":"प्रोटोकॉल संस्करण","Proxy setting":"प्रॉक्सी सेटिंग","Received Time":"प्राप्त समय","Redirecting...":"पुनर्निर्देशित ...","Search for block, transaction or address":"ब्लॉक, लेनदेन या पते के लिए खोज","See all blocks":"सभी ब्लाकों देखें","Show Transaction Output data":"दिखाएँ ट्रांजैक्शन आउटपुट डाटा","Show all":"सभी दिखाएँ","Show input":"दिखाएँ इनपुट","Show less":"दिखाएँ कम","Show more":"अधिक दिखाएँ","Size":"आकार","Size (bytes)":"आकार (बैट)","Skipped Blocks (previously synced)":"छोड़ा ब्लाकों (पहले समन्वयित)","Start Date":"आरंभ करने की तिथि","Status":"स्थिति","Summary":"सारांश","Summary <small>confirmed</small>":"सारांश <small>पुष्टि की</small>","Sync Progress":"सिंक प्रगति","Sync Status":"सिंक स्थिति","Sync Type":"सिंक प्रकार","Synced Blocks":"सिंक किया गया ब्लाकों","Testnet":"टेस्ट नेट","There are no transactions involving this address.":"इस पते को शामिल नहीं लेनदेन कर रहे हैं.","Time Offset":"समय ऑफसेट","Timestamp":"टाइमस्टैम्प","Today":"आज","Total Amount":"कुल रकम","Total Received":"प्राप्त कुल","Total Sent":"कुल भेजा","Transaction":"लेनदेन","Transaction Output Set Information":"ट्रांजैक्शन उत्पादन सेट सूचना","Transaction Outputs":"ट्रांजैक्शन आउटपुट","Transactions":"लेनदेन","Type":"प्रकार","Unconfirmed":"अपुष्ट","Unconfirmed Transaction!":"अपुष्ट ट्रांजैक्शन!","Unconfirmed Txs Balance":"अपुष्ट Txs बैलेंस","Value Out":"मूल्य बाहर","Version":"संस्करण","Waiting for blocks...":"ब्लॉक के लिए प्रतीक्षा कर रहा है ...","Waiting for transactions...":"लेनदेन के लिए प्रतीक्षा कर रहा है ...","by date.":"तिथि के अनुसार.","first seen at":"पहले देखा","Block Type":"ब्लॉक प्रकार","created at":"बनाया","found on:":"पाया:","Waiting for blocks":"Esperando bloques"});
    gettextCatalog.setStrings('ja', {"(Input unconfirmed)":"(入力は未検証です)","404 Page not found :(":"404 ページがみつかりません (´・ω・`)","About":"はじめに","Address":"アドレス","Age":"生成後経過時間","An error occured in the verification process.":"検証過程でエラーが発生しました。","An error occured:<br>{{error}}":"エラーが発生しました:<br>{{error}}","Application Status":"アプリケーションの状態","Best Block":"最良ブロック","BitcoinDark comes with a way of signing arbitrary messages.":"BitcoinDarkには任意のメッセージを署名する昨日が備わっています。","BitcoinDark node information":"BitcoinDarkノード情報","Block":"ブロック","Block Reward":"ブロック報酬","Blocks":"ブロック","Broadcast Raw Transaction":"生のトランザクションを配信","Bytes Serialized":"シリアライズ後の容量 (バイト)","Can't connect to BitcoinDarkd to get live updates from the p2p network. (Tried connecting to BitcoinDarkd at {{host}}:{{port}} and failed.)":"P2Pネットワークからライブ情報を取得するためにBitcoinDarkdへ接続することができませんでした。({{host}}:{{port}} への接続を試みましたが、失敗しました。)","Can't connect to ExploreBTCD server. Attempting to reconnect...":"ExploreBTCD サーバに接続できません。再接続しています...","Can't connect to internet. Please, check your connection.":"インターネットに接続できません。コネクションを確認してください。","Complete":"完了","Confirmations":"検証数","Conn":"接続数","Nodes Connected":"他ノードへの接続","Current Blockchain Tip (ExploreBTCD)":"現在のブロックチェインのTip (ExploreBTCD)","Current Sync Status":"現在の同期状況","Details":"詳細","Difficulty":"難易度","Double spent attempt detected. From tx:":"二重支払い攻撃をこのトランザクションから検知しました：","Error message:":"エラーメッセージ:","Error!":"エラー！","Fee":"手数料","Reward":"褒賞","Final Balance":"最終残高","Finish Date":"終了日時","Go to home":"ホームへ","Hash Serialized":"シリアライズデータのハッシュ値","Height":"ブロック高","Supply":"供給","Included in Block":"取り込まれたブロック","Incoherence in levelDB detected:":"levelDBの破損を検知しました:","Info Errors":"エラー情報","Initial Block Chain Height":"起動時のブロック高","Input":"入力","Last Block":"直前のブロック","Last Block Hash (BitcoinDarkd)":"直前のブロックのハッシュ値 (BitcoinDarkd)","Latest Blocks":"最新のブロック","Latest Transactions":"最新のトランザクション","Loading Address Information":"アドレス情報を読み込んでいます","Loading Block Information":"ブロック情報を読み込んでいます","Loading Selected Date...":"選択されたデータを読み込んでいます...","Loading Transaction Details":"トランザクションの詳細を読み込んでいます","Loading Transactions...":"トランザクションを読み込んでいます...","Loading...":"ロード中...","Message":"メッセージ","Block Time":"ブロックタイム","Found by":"によって発見","PoS Difficulty":"PoSと難易度","PoW Difficulty":"PoWと難易度","Next Block":"次のブロック","Block Type":"ブロック体","No Inputs (Newly Generated Coins)":"入力なし (新しく生成されたコイン)","No blocks yet.":"ブロックはありません。","No matching records found!":"一致するレコードはありません！","No. Transactions":"トランザクション数","Number Of Transactions":"トランザクション数","Output":"出力","PoS Block":"PoS とブロック","PoW Block":"Pow とブロック","Powered by":"Powered by","Previous Block":"前のブロック","Protocol version":"プロトコルバージョン","Proxy setting":"プロキシ設定","Raw transaction data":"トランザクションの生データ","Raw transaction data must be a valid hexadecimal string.":"生のトランザクションデータは有効な16進数でなければいけません。","Received Time":"受信時刻","Redirecting...":"リダイレクトしています...","Search for block, transaction or address":"ブロック、トランザクション、アドレスを検索","See all blocks":"すべてのブロックをみる","Send transaction":"トランザクションを送信","Show Transaction Output data":"トランザクションの出力データをみる","Show all":"すべて表示","Show input":"入力を表示","Show less":"隠す","Show more":"表示する","Signature":"署名","Size":"サイズ","Size (bytes)":"サイズ (バイト)","Skipped Blocks (previously synced)":"スキップされたブロック (同期済み)","Start Date":"開始日時","Status":"ステータス","Summary":"概要","Summary <small>confirmed</small>":"サマリ <small>検証済み</small>","Sync Progress":"同期の進捗状況","Sync Status":"同期ステータス","Sync Type":"同期タイプ","Total Supply":"総供給","Synced Blocks":"同期されたブロック数","Testnet":"テストネット","The message failed to verify.":"メッセージの検証に失敗しました。","The message is verifiably from {{verification.address}}.":"メッセージは{{verification.address}}により検証されました。","There are no transactions involving this address.":"このアドレスに対するトランザクションはありません。","This form can be used to broadcast a raw transaction in hex format over\n        the BitcoinDark network.":"このフォームでは、16進数フォーマットの生のトランザクションをBitcoinDarkネットワーク上に配信することができます。","This form can be used to verify that a message comes from\n        a specific BitcoinDark address.":"このフォームでは、メッセージが特定のBitcoinDarkアドレスから来たかどうかを検証することができます。","Time Offset":"時間オフセット","Timestamp":"タイムスタンプ","Today":"今日","Total Amount":"BitcoinDark総量","Total Received":"総入金額","Total Sent":"総送金額","Transaction":"トランザクション","Transaction Output Set Information":"トランザクションの出力セット情報","Transaction Outputs":"トランザクションの出力","Transaction succesfully broadcast.<br>Transaction id: {{txid}}":"トランザクションの配信に成功しました。<br>トランザクションID: {{txid}}","Transactions":"トランザクション","Type":"タイプ","Unconfirmed":"未検証","Unconfirmed Transaction!":"未検証のトランザクションです！","Unconfirmed Txs Balance":"未検証トランザクションの残高","Value Out":"出力値","Verify":"検証","Verify signed message":"署名済みメッセージを検証","Version":"バージョン","Waiting for blocks...":"ブロックを待っています...","Waiting for transactions...":"トランザクションを待っています...","by date.":"日毎。","first seen at":"最初に発見された日時","created at":"で作成されました","found":"見つかりました","found on:":"上のが見つかりました:","(Mainchain)":"(メインチェーン)","(Orphaned)":"(孤立したブロック)","Bits":"Bits","Block #{{block.height}}":"ブロック #{{block.height}}","BlockHash":"ブロックのハッシュ値","Blocks <br> mined on:":"ブロック <br> 採掘日","Coinbase":"コインベース","Hash":"ハッシュ値","LockTime":"ロック時間","Merkle Root":"Merkleルート","Nonce":"Nonce","Ooops!":"おぉっと！","Output is spent":"出力は使用済みです","Output is unspent":"出力は未使用です","Scan":"スキャン","Show/Hide items details":"アイテムの詳細を表示または隠す","Waiting for blocks":"ブロックを待っています","by date. {{detail}} {{before}}":"日時順 {{detail}} {{before}}","scriptSig":"scriptSig","{{tx.confirmations}} Confirmations":"{{tx.confirmations}} 検証","<span class=\"glyphicon glyphicon-warning-sign\"></span> (Orphaned)":"<span class=\"glyphicon glyphicon-warning-sign\"></span> (孤立したブロック)","<span class=\"glyphicon glyphicon-warning-sign\"></span> Incoherence in levelDB detected: {{vin.dbError}}":"<span class=\"glyphicon glyphicon-warning-sign\"></span> Incoherence in levelDB detected: {{vin.dbError}}","Waiting for blocks <span class=\"loader-gif\"></span>":"ブロックを待っています <span class=\"loader-gif\"></span>"});
/* jshint +W100 */
}]);