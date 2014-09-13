Element.prototype.on = Element.prototype.addEventListener;
Element.prototype.off = Element.prototype.removeEventListener;
Element.prototype.index = function (child) {
  for(var i=0; i<this.children.length; i++) {
    if (child==this.children[i]) return i;
  }
  return 0;
};
EventTarget.prototype.trigger = EventTarget.prototype.dispatchEvent;
window.$ = function (q) {
  var items = document.querySelectorAll(q);
  return items.length === 1 ? items[0] : items;
};
window.toInt = window.parseInt;
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;
window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.oCancelAnimationFrame;
window.Matrix = window.WebKitCSSMatrix || window.MSCSSMatrix || window.CSSMatrix;
window.PI = Math.PI;
window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
window.store = window.localStorage;
window.body = document.body;

var game = (function(){
  var _container = $('.game-container'),
      _canvas = $('#game-canvas'),
      _camera = new Camera($('#game-camera')),
      _templates = {
        car: $('#car-template'),
        level: $('#level-template'),
        wheel: $('#wheel-template'),
        cone: $('#cone-template'),
        pintoSide: $('#pinto-side-template')
      },
      _cameraPerspective = 500,
      _hasInit = false,
      _isPaused = true,
      _requestId,
      _player,
      _playerShadow,
      _level,
      _playerController,
      _cameraResizeTimeout,

      _levels = [
      {
        name: 'Twin Peaks',
        numCones: 4,
        coneColors: ['blue'],
        bonusConeRatio: 0.2,
        scoreToWin: 50,
        userTime: retreive('lvl0time') || '0.00',
        speed: 18,
        topColor: '#1D2B64',
        botColor: '#F8CDDA',
        patterns: [
          // ampMulti, conesPerWave, len, dir
          makeWavePattern(0.5, 70, 10, 1)
        ]
      },{
        name: 'Stinson',
        numCones: 8,
        coneColors: ['blue'],
        bonusConeRatio: 0.1,
        scoreToWin: 70,
        userTime: retreive('lvl1time') || '0.00',
        speed: 24,
        topColor: '#4CB8C4',
        botColor: '#3CD3AD',
        patterns: [
          makeWavePattern(0.15, 40, 70, 1)
        ]
      },{
        name: 'Big Basin',
        numCones: 12,
        coneColors: ['green'],
        bonusConeRatio: 0,
        scoreToWin: 10,
        userTime: retreive('lvl2time') || '0.00',
        speed: 24,
        topColor: '#16222A',
        botColor: '#3A6073',
        patterns: [
          makeWavePattern(0.5, 70, 10, 1)
        ]
      },{
        name: 'Alcatraz',
        numCones: 4,
        coneColors: ['red'],
        bonusConeRatio: 0.6,
        scoreToWin: 120,
        userTime: retreive('lvl3time') || '0.00',
        speed: 30,
        topColor: '#1F1C2C',
        botColor: '#928DAB',
        patterns: [
          function (n) {
            return rand(120, _level.width-120)
          }
        ]
      },{
        name: 'Ocean Beach',
        numCones: 14,
        coneColors: ['green'],
        bonusConeRatio: 0,
        scoreToWin: 10,
        userTime: retreive('lvl4time') || '0.00',
        speed: 24,
        topColor: '#085078',
        botColor: '#85D8CE',
        patterns: [
          makeWavePattern(0.5, 70, 10, 1)
        ]
      },{
        name: 'Muir Woods',
        numCones: 8,
        coneColors: ['green'],
        bonusConeRatio: 0.5,
        scoreToWin: 40,
        userTime: retreive('lvl5time') || '0.00',
        speed: 22,
        topColor: '#134E5E',
        botColor: '#71B280',
        patterns: [
          makeWavePattern(0.6, 70, 5, 1)
        ]
      },{
        name: 'San Quentin',
        numCones: 12,
        coneColors: ['red'],
        bonusConeRatio: 0.4,
        scoreToWin: 180,
        userTime: retreive('lvl6time') || '0.00',
        speed: 24,
        topColor: '#C04848',
        botColor: '#480048',
        patterns: [
          function (n) {
            n = rand(0, n * 10);
            n %= _level.width - 300;
            n += 150;
            return n;
          }
        ]
      },{
        name: 'The Abyss',
        numCones: 32,
        coneColors: ['red'],
        bonusConeRatio: 0.666,
        scoreToWin: 60,
        userTime: retreive('lvl7time') || '0.00',
        speed: 46,
        topColor: '#000',
        botColor: '#000',
        patterns: [
          function (n) {
            return rand(50, _level.width-50)
          }
        ]
      }
    ];

  function init () {
    _hasInit = true;
    _player = new Car();
    _playerShadow = new Shadow(
      'car-shadow',
      _player,
      { padding: 3 });

    _level = new Level(_levels[0]);
    _playerController = new PlayerController(_player);
    _level.destroyCones();

    $('.title-view').classList.add('animated','bounceInDown');

    _level.add(_player,'children');
    _level.add(_playerShadow,'children');
    _camera.el.appendChild(_level.el);

    updateScene();

    body.on('hit-cone', function (e) {
      var cone = e.detail.cone,
        points = 1;

      _level.numConesHit++;
      _level.numCombo++;

      if (_level.numCombo > 3) {
        $('.combo-counter').innerText = _level.numCombo;
        $('.combo-counter-animate').classList.add('show');
      }

      if (cone && cone.color === 'gold') {
        points = 4;
        Sound('triangle',_level.numConesHit, true);
      }

      Sound('sine',_level.numConesHit);

      points = _level.score + points;
      _level.setScore(points);

      if (_level.percentComplete() >= 100) {
        _level.finished();
      }

    });

    // init level buttons
    var lvlData,
        lvlBtn,
        lvlRating,
        lvlTime,
        star;

    for (var i=0; i < _levels.length; i++) {
      lvlData = _levels[i];
      lvlBtn = el('button');
      lvlBtn.innerText = lvlData.name;
      // lvlRating = el('div');
      // lvlRating.classList.add('level-rating');
      // lvlBtn.appendChild(lvlRating);

      // if (lvlData.rating !== undefined) {
      //   for (var j=0; j < 3; j++) {
      //     star = el('div');
      //     if (j < lvlData.rating) {
      //       star.classList.add('icon-star');
      //     } else {
      //       star.classList.add('icon-star-empty');
      //     }
      //     lvlRating.appendChild(star);
      //   }
      // }

      lvlTime = el('div');
      lvlTime.className = 'level-time';
      lvlTime.innerText = lvlData.userTime;
      lvlBtn.appendChild(lvlTime);

      lvlBtn.style.backgroundImage = linearGradient(lvlData.topColor,lvlData.botColor);
      $('.levels').appendChild(lvlBtn);
    }
    $('.levels').on('click', function (e) {
      if (e.target !== e.currentTarget) {
        var lvlIndex = e.currentTarget.index(e.target);
        _level.restart();
        game.setLevel(lvlIndex);
        game.setView('hud-view');
        game.start();
      }
    });
    // end init level buttons

    window.onresize = onSceneResize;

    window.player = _player;
    window.playerShadow = _playerShadow;
    window.level = _level;
    window.camera = _camera;
  }

  function onSceneResize () {
    clearTimeout( _cameraResizeTimeout );
    _cameraResizeTimeout = setTimeout(function () { updateScene(); }, 300);
  }

  function updateScene () {
    _camera.render();

    _player.pos.y = _level.height - 200;
    _level.offsetZ = -_container.clientHeight * 0.36;
    _level.pos.y =  - _player.pos.y - _player.height * 0.5;
    _level.render();
  }


  function onStep () {
    _playerController.update();

    _player
      .update()
      .render();

    _playerShadow
      .update()
      .render();

    _level
      .update()
      .render();

    _camera
      .update()
      .render();

    for (var i = _level.cones.length - 1; i >= 0; --i) {
      if (_level.cones[i]) {
        _level.cones[i]
          .update()
          .render();
      }
    }

    if (_cameraPerspective >= 1200) {
      _cameraPerspective = 1200;
    } else {
      _cameraPerspective += 6;
    }
    _canvas.style.perspective = _cameraPerspective + 'px';

  }

  function Camera (el) {
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);
    this.el = el;

    this.pos.x = 0;
    this.pos.y = -170;
    this.pos.z = 600;
    this.rotation.x = 75;
    this.rotation.y = 0;
    this.rotation.z = 0;
    this.has360View = true;

    this.set360View = function (n, speed) {
      this.has360View = n;
      this.viewRotateSpeed = speed;
      if (!n) {
        _camera.rotation.z %= 360;
        if (_camera.rotation.z > 180) {
          _camera.rotation.z %= 180;
          _camera.rotation.z = 180 - _camera.rotation.z;
        }
      }
      return this;
    };

    this.update = function () {
      if (this.has360View) {
        // rate of 360 spin
        this.rotation.z += 0.25;
      } else {
        // rate of return to normal view
        this.rotation.z *= 0.97;

        if (this.rotation.z !== 0) {
          this.rotation.z = Math.abs(this.rotation.z) > 0.001 ? this.rotation.z : 0;
        }
      }
      return this;
    };
  }

  function Cone (color) {
    Templatable(this, 'cone');
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);
    Physicsable(this);

    this.setHidden = function (n) {
      if (n) {
        this.el.classList.add('hide');
      } else {
        this.el.classList.remove('hide');
      }
      _isHidden = n;
      return this;
    };
    this.isHidden = function () {
      return _isHidden;
    };

    this.setColor = function (color) {
      this.color = color;
      this.el.classList.remove('cone-blue');
      this.el.classList.remove('cone-red');
      this.el.classList.remove('cone-gold');
      this.el.classList.remove('cone-green');
      this.el.classList.add('cone-' + color);
      return this;
    };

    this.reset = function () {
      this.isHit = false;
      this.el.classList.remove('cone-fall');
      return this;
    };

    this.update = function () {
      var isHitX = this.pos.x > _player.pos.x - 20 && this.pos.x < _player.pos.x + 35,
          isHitY = this.pos.y + 30 < _player.pos.y && this.pos.y + 60 > _player.pos.y,
          isHit = isHitX && isHitY && !_isHidden;

      if (isHit) {
        if (!this.el.classList.contains('cone-fall')) {
          this.rotation.z = rand(0,40);
          body.trigger(new CustomEvent('hit-cone',{detail: {cone:this}}));
        }
        this.el.classList.add('cone-fall');
        this.isHit = true;
      }

      if (this.pos.y > _player.pos.y && !this.isHit) {
        _level.numCombo = 0;

        if ($('.combo-counter-animate').classList.contains('show')) {
          delay(function() {
            $('.combo-counter-animate').classList.remove('show');
          },200);
        }
      }

      return this;
    };


    var _isHidden = false;
    this.el.classList.add('cone');
    this.pos.z = 1;

    this.coneAnimate = this.el.querySelector('.cone-animate');
    this.coneAnimate.classList.add('fall'+(Math.ceil(rand(0,3))));

    this.setColor(color || 'blue');
  }

  function Shadow (shadowType,target, options) {
    this.target = target;
    this.options = options || this.defaults;

    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);

    this.update = function () {
      this.pos.x = this.target.pos.x - this.options.padding;
      this.pos.y = this.target.pos.y - this.options.padding;
      this.rotation.x = this.target.rotation.x;
      // this.rotation.y = this.target.rotation.y;
      this.rotation.z = this.target.rotation.z;
      return this;
    };

    this.el = el('div');
    this.el.classList.add('shadow');
    this.el.classList.add(shadowType);
    this.el.style.width = toInt(this.target.el.style.width) + this.options.padding * 2 + 'px';
    this.el.style.height = toInt(this.target.el.style.height) + this.options.padding * 2 + 'px';
    this.pos.z = 2;

    return this;
  }
  Shadow.prototype.defaults = {
    padding: 0
  };

  function Car () {
    Templatable(this, 'car');
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);
    Physicsable(this);

    this.wheels = {
      fl: {
        el: this.el.getElementsByClassName('wheel-f-l')[0]
      },
      fr: {
        el: this.el.getElementsByClassName('wheel-f-r')[0]
      },
      rl: {
        el: this.el.getElementsByClassName('wheel-r-l')[0]
      },
      rr: {
        el: this.el.getElementsByClassName('wheel-r-r')[0]
      }
    };

    this.bodyL = this.el.querySelector('.body-left');
    this.bodyLT = this.el.querySelector('.body-left-top');
    this.bodyR = this.el.querySelector('.body-right');
    this.bodyRT = this.el.querySelector('.body-right-top');

    this.wheels.fl.el.appendChild(_templates.wheel.content.cloneNode(true));
    this.wheels.fr.el.appendChild(_templates.wheel.content.cloneNode(true));
    this.wheels.rl.el.appendChild(_templates.wheel.content.cloneNode(true));
    this.wheels.rr.el.appendChild(_templates.wheel.content.cloneNode(true));

    this.width = 33;
    this.height = 100;
    this.pos.x = 200;
    this.pos.y = 5700;
    this.pos.z = 2;


    this.speed = 24;
    this.maxSpeed = 55;
    this.handling = 1;
    this.smoothness = 1;
    this.maxLeanAngle = 20;
    this.leanStartTime = 0;
    this.maxTurnAngle = 30;

    this.el.style.width = this.width + 'px';
    this.el.style.height = this.height + 'px';

    this.boost = function () {
      return Math.floor(_level.numCombo / 1);
    };

    this.update = function () {
      //--- TURN
      var rz =  this.rotation.z;
      rz = rz >  this.maxTurnAngle ?  this.maxTurnAngle : rz;
      rz = rz < -this.maxTurnAngle ? -this.maxTurnAngle : rz;
      this.rotation.z = rz;


      // derive vel from turning angle
      this.vel.x = -this.speed * this.rotation.z / 90;
      // increment pos
      this.pos.x -= this.vel.x;
      return this;
    };

    return this;
  }

  /*
   *  CONTROLLER
   */

  function PlayerController (player) {

    var _body = document.body,
        _player = player,
        _isRight = false,
        _isLeft = false;

    _body.on('keydown', onKeyDown);
    _body.on('keyup', onKeyUp);

    function onKeyDown (e) {
      if (!7280%e.keyCode) e.preventDefault();
      var handler = {
        37: onLeftDown,
        39: onRightDown,
        65: onLeftDown,
        68: onRightDown,
        80: game.togglePlay.bind(game)
      };
      if (handler[e.keyCode]) handler[e.keyCode]();
    }

    function onKeyUp (e) {
      e.preventDefault();
      var handler = {
        37: onLeftUp,
        39: onRightUp,
        65: onLeftUp,
        68: onRightUp
      };
      if (handler[e.keyCode]) handler[e.keyCode]();
    }

    function onLeftDown () {
      _isLeft = true;
    }
    function onRightDown () {
      _isRight = true;
    }
    function onLeftUp () {
      _isLeft = false;
    }
    function onRightUp () {
      _isRight = false;
    }

    return {
      isLeft: _isLeft,
      isRight: _isRight,
      update: function () {
        var angle = 0,
          wheelAngle;

        if (_isLeft) {
          angle = -_player.handling;

          // leaning
          if (_player.rotation.y > -_player.maxLeanAngle * (_player.speed/_player.maxSpeed)) {
            _player.rotation.y -= 1;
          }

        } else if (_isRight) {
          angle = _player.handling;

          // leaning
          if (_player.rotation.y < _player.maxLeanAngle * (_player.speed/_player.maxSpeed)) {
            _player.rotation.y += 1;
          }
        } else {
          _player.rotation.z *= _player.smoothness;

          // leaning return

          if (_player.rotation.y !== 0) {
            _player.rotation.y *= 0.9;

            _player.rotation.y = Math.abs(_player.rotation.y) < 0.1 ? 0 : _player.rotation.y;

          }
        }

        _player.rotation.prevZ = _player.rotation.z;
        _player.rotation.z += angle;
      }
    };
  }


  /*
   *  WHEEL
   */

  function Wheel () {
    Templatable(this, 'wheel');
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);

    return this;
  }

  /*
   *  LEVEL
   */

  function Level (options) {
    Templatable(this, 'level');
    Collectable(this,'children');
    Positionable(this);
    Rotatable(this);
    Scalable(this);
    Renderable(this);

    this.width = 604;
    this.height = 2000;
    this.offsetX = 0;
    this.offsetZ = 0;
    this.rotation.x = 0;
    this.pos.y = 0;
    this.gridSize = 160;
    this.cones = [];
    this.conesPassed = 0;
    this.guardOffset = -10;
    this.numConesHit = 0;
    this.numCombo = 0;
    this.coneColors = [];
    this.score = 0;
    this.timer = $('#timer');
    this.completedTime = $('#completed-time');
    this.startTime = 0;
    this.endTime = 0;
    this.offsetTime = 0;
    this.patterns = [makeWavePattern(0.5, 70, 10, 1)];

    this.el.style.width = this.width + 'px';
    this.el.style.height = this.height + 'px';

    this.road = {
      el: this.el.getElementsByClassName('road')[0]
    };
    Positionable(this.road);

    this.setOptions = function (options) {
      for(var i in options) {
        this[i] = options[i];
      }
      this.changeBg(this.topColor, this.botColor);
      this.restart();
    };

    this.setScore = function (score) {
      this.score = score;
      $('.progress-fill').style.width = this.percentComplete() + '%';
    };

    this.pause = function () {
      this.pauseStartTime = time();
    };
    this.unpause = function () {
      this.offsetTime += time() - this.pauseStartTime;
    };
    this.changeBg = function (topColor, botColor) {
      $('.bg-gradient').style.background = linearGradient(topColor,botColor);
      $('.bg-gradient').classList.add('show');
      delay(function () {
        document.body.style.background = linearGradient(topColor,botColor);
        $('.bg-gradient').classList.remove('show');
      }, 2000, this);
    };
    this.restart = function () {
      this.setScore(0);
      this.numConesHit = 0;
      this.destroyCones();
      this.startTime = 0;
      this.endTime = 0;
      this.offsetTime = 0;
      this.numCombo = 0;
      this.isFinished = false;

      $('.combo-counter-animate').classList.remove('show');
      this.start();
    };
    this.start = function () {
      this.createCones();
      this.startTime = time();
      this.pauseStartTime = 0;
    };
    this.elapsedTime = function () {
      var ms = Math.floor((this.endTime - this.startTime - this.offsetTime) * 0.1);
      return (ms * 0.01).toFixed(2);
    };
    this.percentComplete = function () {
      return this.score / this.scoreToWin * 100;
    };
    this.isBestTime = function (lvlIndex, newTime) {
      var old = parseFloat(retreive('lvl'+lvlIndex+'time')) || Number.MAX_VALUE;
      return newTime < old;
    };
    this.createCones = function () {
      var cone;

      for (var i = 0; i < this.numCones; i++) {
        cone = new Cone(this.getRandomConeColor());
        cone.setHidden(true);
        cone.pos.x = rand(20, this.width - 20);
        cone.pos.y = i/this.numCones * this.height;

        this.add(cone,'children');
        this.cones.push(cone);
      }
      return this;
    };
    this.destroyCones = function () {
      this.cones.forEach( function (cone, index, cones) {
        cone.el.remove();
      });
      while(this.cones.length > 0) {
        this.cones.pop();
      }
    };

    this.getRandomConeColor = function () {
      var n = Math.floor(rand(0,this.coneColors.length)),
        color = this.coneColors[n];

      if (rand(0,1) < this.bonusConeRatio) {
        color = 'gold';
      }
      return color;
    };

    this.finished = function () {
      var userTime,
          i = game.levelIndex;

      this.isFinished = true;
      this.destroyCones();
      delay(function () {
        setView('complete-view');
      },1000);
      this.endTime = time();
      userTime = this.elapsedTime();
      this.completedTime.innerText = userTime;

      if (this.isBestTime(i, userTime)) {
        // best time
        $('.complete-view').classList.add('best-time');
        save('lvl' + i + 'time',userTime);
        $('.level-time')[i].innerText = userTime;
      } else {
        $('.complete-view').classList.remove('best-time');
      }

    };
    this.update = function () {
      if (!this.isFinished) this.endTime = time();
      this.timer.innerHTML = this.elapsedTime();

      var levelSpeed = this.speed + _player.boost() - Math.abs(_player.vel.x);
      this.road.pos.y -= levelSpeed;
      this.road.pos.y = this.road.pos.y < -this.gridSize ? this.road.pos.y%this.gridSize : this.road.pos.y;
      this.road.el.style.transform = 'translateY(' + -this.road.pos.y + 'px) translateZ(0px)';

      // shift level
      this.pos.x = -this.width * 0.5;
      this.pos.z = this.offsetZ;

      // cone loop
      this.cones.forEach(function (cone, index) {
        cone.pos.y += levelSpeed;

        // reset cone position
        if (cone.pos.y > _level.height) {
          cone
            .setHidden(false)
            .reset(false);

          cone.pos.y = 0;
          cone.pos.x = _level.patterns[0](_level.conesPassed);
          cone.rotation.z = 0;
          cone.setColor( _level.getRandomConeColor() );
          _level.conesPassed++;
        }
      });
      // end cone loop

      var maxPlayerX = this.width + this.guardOffset - _player.width * 0.5;
      if ( _player.pos.x < -this.guardOffset ) {
        _player.pos.x = -this.guardOffset;
      } else if ( _player.pos.x > maxPlayerX ) {
        _player.pos.x = maxPlayerX;
      }

      return this;
    };

    this.setOptions(options);
    return this;
  }


  function step (timestamp) {
    _requestId = requestAnimationFrame(step);
    onStep();
  }

  function setView (view, isRestart) {
    var views = ['title-view', 'instructions-view', 'level-select-view', 'pause-view', 'hud-view','complete-view'],
        isPause = view === 'pause-view',
        isHud = view === 'hud-view';

    // hide all views
    views.forEach(function (v, index) {
      if (view !== v && !(v==='hud-view' && isPause)) {
        $('.' + v).classList.add('exitOutDown');
        $('.' + v).classList.remove('bounceInDown');
      }
    });
    delay(function(){
      views.forEach(function (v, index) {
        if (view !== v && !(v==='hud-view' && isPause)) {
          $('.' + v).classList.remove('exitOutDown','animated');
        }
      });
    },800);

    // show this view
    $('.' + view).classList.add('animated', 'bounceInDown');

    if (view==='pause-view') {
      _camera.set360View(true);
      clearInterval(this.pauseInterval);
      _level.pause();
      this.pauseInterval = setInterval(function () {
        _camera
          .update()
          .render();
      },10);
      game.pause();
    }

    if (view==='hud-view') {
      _camera.set360View(false);

      if (this.prevView==='pause-view') {
        delay(function(){
          if (!isRestart) _level.unpause();
          game.start();
        },1000);
      }
    }

    if (view==='complete-view') {
      if (game.levelIndex >= _levels.length - 1) {
        $('.btn-next-level').classList.add('hide');
      } else {
        $('.btn-next-level').classList.remove('hide');
      }
    }

    this.prevView = view;
  }

  return {
    togglePlay: function () {
      return _isPaused? this.start() : this.pause();
    },
    start: function () {
      if (!_hasInit) {
        init();
      }
      if (_isPaused) {
        step();
      }
      _isPaused = false;
      _camera.el.classList.remove('game-paused');
      return this;
    },
    pause: function () {
      cancelAnimationFrame(_requestId);
      _stopTime = time();
      _camera.el.classList.add('game-paused');
      _isPaused = true;
      return this;
    },
    setLevel: function (num) {
      game.levelIndex = num;
      _camera.set360View(false);
      _level.setOptions(_levels[num]);
      return this;
    },
    nextLevel: function () {
      var lvlIndex = game.levelIndex + 1;
      game
        .setLevel(lvlIndex)
        .start();
      setView('hud-view');
      _level.restart();

      return this;
    },
    restartLevel: function () {
      setView('hud-view', true);
      _level.restart();
    },
    exit: function () {
      setView('title-view');
      _level.destroyCones();
      game.start();
    },
    setView: function (view) {
      setView(view);
    }
  };


  /*
   *  DECORATORS
   */

  function Templatable (o,templateName) {
    o.el = el('div');
    o.el.classList.add(templateName);
    o.el.appendChild(_templates[templateName].content.cloneNode(true));
  }

  function Collectable (o,type) {
    if (!o.collections) o.collections = {};
    o.collections[type] = [];
    o.add = function (n,type) {
      try {
        o.collections[type].push(n);
        if (n.render) {
          o.el.appendChild(n.el);
        }
      } catch (e) {
        throw new Error('Cannot add \'undefined\' to collection ' + 'to ' + type);
      }
      return o;
    };
    o.remove = function (n,type) {
      log('remove');
      var item;
      for (var i in o.collections[type]) {
        log(o.collections[type][i], n);
        item = o.collections[type][i];
        if (item == n) {
          if (item.render) {
            item.el.parentNode.removeChild(item.el);
          }
          o.collections[type] = o.collections[type].splice(1,i);
        }
      }
    };
  }

  function Positionable (o) {
    o.pos = {
      x: 0,
      y: 0,
      z: 0
    };
  }

  function Physicsable (o,minVel,maxVel) {
    o.minVel = minVel || -250;
    o.maxVel = maxVel || 250;

    o.vel = {
      x: 0,
      y: 0,
      z: 0
    };
  }

  function Scalable (o) {
    o.scale = {
      x: 1,
      y: 1,
      z: 1
    };
  }

  function Rotatable (o) {
    o.rotation = {
      x: 0,
      y: 0,
      z: 0
    };
  }

  function Renderable (o) {
    o.update = function () {
      return o;
    };
    o.render = function () {
      var s = {
        x: o.scale.x,
        y: o.scale.y,
        z: o.scale.z
      },
      p = {
        x: o.pos.x,
        y: o.pos.y,
        z: o.pos.z,
      },
      r = {
        x: o.rotation.x,
        y: o.rotation.y,
        z: o.rotation.z,
      };

      o.el.style.transform = 'translate3d(' + p.x + 'px, ' + p.y + 'px, ' + p.z + 'px) ' +
                              'scale3d(' + s.x + ', ' + s.y + ', ' + s.z + ') ' +
                              'rotateX(' + r.x + 'deg) ' +
                              'rotateZ(' + r.z + 'deg) ' +
                              'rotateY(' + r.y + 'deg) ' +
                              '';
      return o;
    };
  }


  /*
   *  UTILS
   */

  function Sound(type, amt, accent) {
    var C4 = 261.626,
        E4 = 329.628,
        A3 = 220,
        A4 = 440,
        D4 = 293.665,
        F4 = 349.228,
        G3 = 195.998,
        G4 = 391.995,
        B3 = 246.942,
        song  = [C4,C4,E4,E4,A3,A3,C4,C4,D4,D4,F4,F4,G3,G3,B3,B3],
        // song2 = [E4,E4,G4,G4,C4,C4,E4,E4,F4,F4,A4,A4,B3,B3,D4,D4],
        songLen = song.length;
        // types = ['sine','square','sawtooth','triangle'];

    play(song, type);

    function play (song, type) {
      var osc = audioCtx.createOscillator(),
        gainNode = audioCtx.createGain();

      osc.type = type;
      osc.frequency.value = song[amt%songLen];
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.value = accent? 0.7 : 0.5;

      osc.start(0);

      setTimeout(function () {
        osc.stop(0);
      },600);
    }
  }
  function makeWavePattern (ampMulti, conesPerWave, len, dir) {
    return function (n) {
      // ampMulti => width of wave
      // len => stretch out wave

      var amp = dir*(n%conesPerWave);
      return ampMulti * _level.width * 0.5 * Math.sin(amp/len * PI*2) + _level.width *0.5;
    }
  }
  function save (key,val) {
    store.setItem(key,val);
  }
  function retreive(key) {
    return store.getItem(key);
  }
  function el (tag) {
    return document.createElement(tag);
  }
  function linearGradient (topColor,botColor) {
    return 'linear-gradient(180deg, ' + topColor + ' 0%, ' + botColor + ' 100%)';
  }
  function delay (callback, time, context) {
    context = !context ? this : context;
    return setTimeout((callback).bind(context),time);
  }

  function Ease (easeType) {
    // t: current time, b: start value, c: change In value, d: duration time
    var easing = {
      cubicIn: function (t, b, c, d) {
        return c*(t/=d)*t*t + b;
      },
      cubicOut: function (t, b, c, d) {
        return c*((t=t/d-1)*t*t + 1) + b;
      },
      cubicInOut: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
      }
    };
    return easing[easeType];
  }

  function time() {
    return new Date().getTime();
  }
  function rand (min,max) {
    return Math.random() * (max - min) + min;
  }
})();
