var Cone = (function () {
  return {
    create: function (color, player) {
      var _ = {};
      Templatable(_, 'cone');
      Positionable(_);
      Rotatable(_);
      Scalable(_);
      Renderable(_);
      Physicsable(_);

      _.setHidden = function (n) {
        if (n) {
          _.el.classList.add('hide');
        } else {
          _.el.classList.remove('hide');
        }
        _isHidden = n;
        return _;
      };
      _.isHidden = function () {
        return _isHidden;
      };

      _.setColor = function (color) {
        _.color = color;
        _.el.classList.remove('cone-blue');
        _.el.classList.remove('cone-red');
        _.el.classList.remove('cone-gold');
        _.el.classList.remove('cone-green');
        _.el.classList.add('cone-' + color);
        return _;
      };

      _.reset = function () {
        _.isHit = false;
        _.el.classList.remove('cone-fall');
        return _;
      };

      _.update = function () {
        var isHitX = _.pos.x > player.pos.x - 20 && _.pos.x < player.pos.x + 35,
            isHitY = _.pos.y + 30 < player.pos.y && _.pos.y + 60 > player.pos.y,
            isHit = isHitX && isHitY && !_isHidden;

        if (isHit) {
          if (!_.el.classList.contains('cone-fall')) {
            _.rotation.z = rand(0,40);
            body.trigger(new CustomEvent('hit-cone',{detail: {cone:_}}));
          }
          _.el.classList.add('cone-fall');
          _.isHit = true;
        }

        if (_.pos.y > player.pos.y && !_.isHit) {
          body.trigger(new CustomEvent('reset-cone-combo'));

          if ($('.combo-counter-animate').classList.contains('show')) {
            delay(function() {
              $('.combo-counter-animate').classList.remove('show');
            },200);
          }
        }

        return _;
      };


      var _isHidden = false;
      _.el.classList.add('cone');
      _.pos.z = 1;

      _.coneAnimate = _.el.querySelector('.cone-animate');
      _.coneAnimate.classList.add('fall'+(Math.ceil(rand(0,3))));

      _.setColor(color || 'blue');
      return _;
    }
  };
})();