window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}

/**
 * 视频对比滑块组件
 * Video Comparison Slider Component
 */
class VideoComparisonSlider {
  constructor(container) {
    this.container = container;
    this.videoLeft = container.querySelector('.video-left video');
    this.videoRight = container.querySelector('.video-right video');
    this.videoLeftWrapper = container.querySelector('.video-left');
    this.handle = container.querySelector('.video-comparison-handle');
    
    // 控制栏元素 - 在容器的兄弟元素中查找
    const controlsContainer = container.nextElementSibling;
    this.progressSlider = controlsContainer ? controlsContainer.querySelector('.video-progress-slider') : null;
    this.timeDisplay = controlsContainer ? controlsContainer.querySelector('.time-display') : null;
    this.controlsContainer = controlsContainer;
    this.isSeeking = false; // 用户是否正在拖动进度条
    
    this.isDragging = false;
    this.position = 50; // 初始位置50%
    this.isPlaying = false;
    this.videosReady = 0; // 追踪已加载的视频数量
    this.masterDuration = 0; // 主时长（较长的视频）
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.updatePosition(50);
  }
  
  bindEvents() {
    // 滑块拖拽事件
    this.handle.addEventListener('mousedown', (e) => this.startDrag(e));
    this.handle.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
    
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('touchmove', (e) => this.onDrag(e), { passive: false });
    
    document.addEventListener('mouseup', () => this.endDrag());
    document.addEventListener('touchend', () => this.endDrag());
    
    // 点击容器也可以移动滑块
    this.container.querySelector('.video-comparison-wrapper').addEventListener('click', (e) => {
      if (!this.isDragging) {
        this.moveToPosition(e);
      }
    });
    
    // 播放控制按钮
    if (this.controlsContainer) {
      const playBtn = this.controlsContainer.querySelector('.btn-play');
      const pauseBtn = this.controlsContainer.querySelector('.btn-pause');
      const restartBtn = this.controlsContainer.querySelector('.btn-restart');
      
      if (playBtn) {
        playBtn.addEventListener('click', () => this.play());
      }
      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => this.pause());
      }
      if (restartBtn) {
        restartBtn.addEventListener('click', () => this.restart());
      }
      
      // 进度条滑动
      if (this.progressSlider) {
        // 开始拖动
        this.progressSlider.addEventListener('mousedown', () => {
          this.isSeeking = true;
        });
        this.progressSlider.addEventListener('touchstart', () => {
          this.isSeeking = true;
        });
        
        // 拖动中
        this.progressSlider.addEventListener('input', (e) => {
          this.seekToValue(parseFloat(e.target.value));
        });
        
        // 结束拖动
        this.progressSlider.addEventListener('mouseup', () => {
          this.isSeeking = false;
        });
        this.progressSlider.addEventListener('touchend', () => {
          this.isSeeking = false;
        });
        this.progressSlider.addEventListener('change', () => {
          this.isSeeking = false;
        });
      }
    }
    
    // 视频时间更新 - 使用主视频（左侧）
    this.videoLeft.addEventListener('timeupdate', () => this.updateProgress());
    
    // 视频加载完成 - 两个视频都需要加载完才能计算同步
    this.videoLeft.addEventListener('loadedmetadata', () => this.onVideoLoaded('left'));
    this.videoRight.addEventListener('loadedmetadata', () => this.onVideoLoaded('right'));
    
    // 循环播放处理
    this.videoLeft.addEventListener('ended', () => this.onVideoEnded());
  }
  
  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
    this.container.style.cursor = 'ew-resize';
  }
  
  onDrag(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    
    const rect = this.container.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    let position = ((clientX - rect.left) / rect.width) * 100;
    
    // 限制范围
    position = Math.max(5, Math.min(95, position));
    
    this.updatePosition(position);
  }
  
  endDrag() {
    this.isDragging = false;
    this.container.style.cursor = '';
  }
  
  moveToPosition(e) {
    const rect = this.container.getBoundingClientRect();
    let position = ((e.clientX - rect.left) / rect.width) * 100;
    position = Math.max(5, Math.min(95, position));
    this.updatePosition(position);
  }
  
  updatePosition(position) {
    this.position = position;
    // 更新滑块位置
    this.handle.style.left = position + '%';
    // 更新左侧视频的裁剪区域
    this.videoLeftWrapper.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
  }
  
  // 视频加载完成后同步时长
  onVideoLoaded(which) {
    this.videosReady++;
    console.log(`Video ${which} loaded. Duration: ${which === 'left' ? this.videoLeft.duration : this.videoRight.duration}s`);
    
    // 两个视频都加载完成后，计算并同步播放速率
    if (this.videosReady >= 2) {
      this.syncVideoDurations();
      this.updateProgress();
      // 自动开始播放
      this.play();
    }
  }
  
  // 同步视频时长 - 让短视频拉伸到长视频的时长
  syncVideoDurations() {
    const leftDuration = this.videoLeft.duration;
    const rightDuration = this.videoRight.duration;
    
    // 取较长的作为主时长
    this.masterDuration = Math.max(leftDuration, rightDuration);
    
    // 计算播放速率
    // 如果左边视频短，加快右边的速率使其与左边同步
    // 如果右边视频短，加快左边的速率使其与右边同步
    // 实际上我们让短的视频慢下来以匹配长的
    
    if (leftDuration < rightDuration) {
      // 左边短，需要减慢左边的播放速度
      this.videoLeft.playbackRate = leftDuration / rightDuration;
      this.videoRight.playbackRate = 1;
      console.log(`Left video is shorter. Left playbackRate: ${this.videoLeft.playbackRate}`);
    } else if (rightDuration < leftDuration) {
      // 右边短，需要减慢右边的播放速度
      this.videoLeft.playbackRate = 1;
      this.videoRight.playbackRate = rightDuration / leftDuration;
      console.log(`Right video is shorter. Right playbackRate: ${this.videoRight.playbackRate}`);
    } else {
      // 时长相同
      this.videoLeft.playbackRate = 1;
      this.videoRight.playbackRate = 1;
    }
    
    console.log(`Master duration: ${this.masterDuration}s`);
  }
  
  play() {
    // 同步当前时间并播放
    const normalizedTime = this.videoLeft.currentTime / this.videoLeft.playbackRate;
    this.videoRight.currentTime = normalizedTime * this.videoRight.playbackRate;
    
    this.videoLeft.play();
    this.videoRight.play();
    this.isPlaying = true;
  }
  
  pause() {
    this.videoLeft.pause();
    this.videoRight.pause();
    this.isPlaying = false;
  }
  
  restart() {
    this.videoLeft.currentTime = 0;
    this.videoRight.currentTime = 0;
    this.play();
  }
  
  // 根据滑动条的值（0-100）跳转
  seekToValue(value) {
    const time = (value / 100) * this.masterDuration;
    
    // 根据各自的播放速率计算实际时间
    this.videoLeft.currentTime = time * this.videoLeft.playbackRate;
    this.videoRight.currentTime = time * this.videoRight.playbackRate;
    
    // 立即更新时间显示
    if (this.timeDisplay && this.masterDuration) {
      const current = this.formatTime(time);
      const total = this.formatTime(this.masterDuration);
      this.timeDisplay.textContent = `${current} / ${total}`;
    }
  }
  
  updateProgress() {
    // 如果用户正在拖动，不更新滑动条位置
    if (this.isSeeking) return;
    
    // 使用归一化的时间来计算进度（基于主时长）
    const normalizedTime = this.videoLeft.currentTime / this.videoLeft.playbackRate;
    
    if (this.progressSlider && this.masterDuration) {
      const progress = (normalizedTime / this.masterDuration) * 100;
      this.progressSlider.value = progress;
    }
    
    if (this.timeDisplay && this.masterDuration) {
      const current = this.formatTime(normalizedTime);
      const total = this.formatTime(this.masterDuration);
      this.timeDisplay.textContent = `${current} / ${total}`;
    }
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  onVideoEnded() {
    // 循环播放
    this.restart();
  }
}

// 初始化所有视频对比滑块
function initVideoComparisonSliders() {
  const containers = document.querySelectorAll('.video-comparison-container');
  containers.forEach(container => {
    new VideoComparisonSlider(container);
  });
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    preloadInterpolationImages();

    $('#interpolation-slider').on('input', function(event) {
      setInterpolationImage(this.value);
    });
    setInterpolationImage(0);
    $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

    bulmaSlider.attach();

    // 初始化视频对比滑块
    initVideoComparisonSliders();

})
