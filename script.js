'use strict';
console.clear();
class Stage {
  constructor() {
    // Metode untuk merender scene
    this.render = function () {
      this.renderer.render(this.scene, this.camera);
    };

    // Metode untuk menambah elemen ke dalam scene
    this.add = function (elem) {
      this.scene.add(elem);
    };

    // Metode untuk menghapus elemen dari scene
    this.remove = function (elem) {
      this.scene.remove(elem);
    };

    // Mendapatkan elemen container dari HTML
    this.container = document.getElementById('game');

    // Inisialisasi renderer dengan antialiasing dan alpha
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });

    // Mengatur ukuran renderer sesuai ukuran jendela
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Mengatur warna latar belakang renderer
    this.renderer.setClearColor('#EEEEEE', 1);

    // Menambahkan renderer ke dalam container
    this.container.appendChild(this.renderer.domElement);

    // Inisialisasi scene
    this.scene = new THREE.Scene();

    // Inisialisasi kamera ortografi
    let aspect = window.innerWidth / window.innerHeight;
    let d = 20;
    this.camera = new THREE.OrthographicCamera(
      -d * aspect,
      d * aspect,
      d,
      -d,
      -100,
      1000
    );
    this.camera.position.x = 2;
    this.camera.position.y = 2;
    this.camera.position.z = 2;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Inisialisasi lampu directional dan ambient
    this.light = new THREE.DirectionalLight(0xffffff, 0.5);
    this.light.position.set(0, 499, 0);
    this.scene.add(this.light);

    this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.softLight);

    // Menangani perubahan ukuran jendela
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  // Metode untuk mengatur posisi dan orientasi kamera dengan animasi TweenLite
  setCamera(y, speed = 0.3) {
    TweenLite.to(this.camera.position, speed, {
      y: y + 4,
      ease: Power1.easeInOut,
    });
    TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
  }

  // Metode untuk menangani perubahan ukuran jendela
  onResize() {
    let viewSize = 30;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.left = window.innerWidth / -viewSize;
    this.camera.right = window.innerWidth / viewSize;
    this.camera.top = window.innerHeight / viewSize;
    this.camera.bottom = window.innerHeight / -viewSize;
    this.camera.updateProjectionMatrix();
  }
}

class Block {
  constructor(block) {
    // States blok yang mungkin
    this.STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };

    // Jumlah pergerakan blok
    this.MOVE_AMOUNT = 12;

    // Dimensi dan posisi awal blok
    this.dimension = { width: 0, height: 0, depth: 0 };
    this.position = { x: 0, y: 0, z: 0 };

    // Mengacu pada blok target sebelumnya
    this.targetBlock = block;

    // Index blok
    this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;

    // Menentukan sumbu kerja dan dimensi kerja berdasarkan indeks
    this.workingPlane = this.index % 2 ? 'x' : 'z';
    this.workingDimension = this.index % 2 ? 'width' : 'depth';

    // Mengatur dimensi dari blok target atau menggunakan default
    this.dimension.width = this.targetBlock
      ? this.targetBlock.dimension.width
      : 10;
    this.dimension.height = this.targetBlock
      ? this.targetBlock.dimension.height
      : 2;
    this.dimension.depth = this.targetBlock
      ? this.targetBlock.dimension.depth
      : 10;

    // Mengatur posisi blok berdasarkan blok target atau menggunakan default
    this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
    this.position.y = this.dimension.height * this.index;
    this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;

    // Mengatur offset warna berdasarkan blok target atau acak
    this.colorOffset = this.targetBlock
      ? this.targetBlock.colorOffset
      : Math.round(Math.random() * 100);

    // Mengatur warna blok
    if (!this.targetBlock) {
      this.color = 0x333344;
    } else {
      let offset = this.index + this.colorOffset;
      var r = Math.sin(0.3 * offset) * 55 + 200;
      var g = Math.sin(0.3 * offset + 2) * 55 + 200;
      var b = Math.sin(0.3 * offset + 4) * 55 + 200;
      this.color = new THREE.Color(r / 255, g / 255, b / 255);
    }

    // Mengatur status blok
    this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;

    // Mengatur kecepatan dan arah blok
    this.speed = -0.1 - this.index * 0.005;
    if (this.speed < -4) this.speed = -4;
    this.direction = this.speed;

    // Membuat geometri dan material blok
    let geometry = new THREE.BoxGeometry(
      this.dimension.width,
      this.dimension.height,
      this.dimension.depth
    );

    // Mengaplikasikan translasi ke geometri untuk penempatan yang benar
    geometry.applyMatrix(
      new THREE.Matrix4().makeTranslation(
        this.dimension.width / 2,
        this.dimension.height / 2,
        this.dimension.depth / 2
      )
    );

    // Mengatur material blok
    this.material = new THREE.MeshToonMaterial({
      color: this.color,
      shading: THREE.FlatShading,
    });

    // Membuat mesh blok
    this.mesh = new THREE.Mesh(geometry, this.material);

    // Mengatur posisi awal mesh berdasarkan status blok
    this.mesh.position.set(
      this.position.x,
      this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0),
      this.position.z
    );

    // Jika blok aktif, mengatur posisi secara acak untuk
    // pergerakan awal
    if (this.state == this.STATES.ACTIVE) {
      this.position[this.workingPlane] =
        Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
    }
  }

  // Metode untuk membalik arah pergerakan blok
  reverseDirection() {
    this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
  }

  // Metode untuk menempatkan blok ke posisi akhirnya dan
  // mengembalikan informasi terkait
  place() {
    this.state = this.STATES.STOPPED;
    let overlap =
      this.targetBlock.dimension[this.workingDimension] -
      Math.abs(
        this.position[this.workingPlane] -
          this.targetBlock.position[this.workingPlane]
      );
    let blocksToReturn = {
      plane: this.workingPlane,
      direction: this.direction,
    };

    // Jika overlap cukup kecil, blok mendapat bonus dan
    // diatur ulang ke posisi blok target
    if (this.dimension[this.workingDimension] - overlap < 0.3) {
      overlap = this.dimension[this.workingDimension];
      blocksToReturn.bonus = true;
      this.position.x = this.targetBlock.position.x;
      this.position.z = this.targetBlock.position.z;
      this.dimension.width = this.targetBlock.dimension.width;
      this.dimension.depth = this.targetBlock.dimension.depth;
    }

    // Jika masih ada overlap, blok dipotong menjadi dua
    if (overlap > 0) {
      let choppedDimensions = {
        width: this.dimension.width,
        height: this.dimension.height,
        depth: this.dimension.depth,
      };
      choppedDimensions[this.workingDimension] -= overlap;
      this.dimension[this.workingDimension] = overlap;

      // Membuat geometri untuk blok yang ditempatkan dan blok yang dipotong
      let placedGeometry = new THREE.BoxGeometry(
        this.dimension.width,
        this.dimension.height,
        this.dimension.depth
      );
      placedGeometry.applyMatrix(
        new THREE.Matrix4().makeTranslation(
          this.dimension.width / 2,
          this.dimension.height / 2,
          this.dimension.depth / 2
        )
      );

      let placedMesh = new THREE.Mesh(placedGeometry, this.material);

      let choppedGeometry = new THREE.BoxGeometry(
        choppedDimensions.width,
        choppedDimensions.height,
        choppedDimensions.depth
      );
      choppedGeometry.applyMatrix(
        new THREE.Matrix4().makeTranslation(
          choppedDimensions.width / 2,
          choppedDimensions.height / 2,
          choppedDimensions.depth / 2
        )
      );

      let choppedMesh = new THREE.Mesh(choppedGeometry, this.material);

      let choppedPosition = {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
      };

      // Menyesuaikan posisi blok yang dipotong
      if (
        this.position[this.workingPlane] <
        this.targetBlock.position[this.workingPlane]
      ) {
        this.position[this.workingPlane] =
          this.targetBlock.position[this.workingPlane];
      } else {
        choppedPosition[this.workingPlane] += overlap;
      }

      placedMesh.position.set(
        this.position.x,
        this.position.y,
        this.position.z
      );

      choppedMesh.position.set(
        choppedPosition.x,
        choppedPosition.y,
        choppedPosition.z
      );

      blocksToReturn.placed = placedMesh;

      // Jika tidak mendapat bonus, blok yang dipotong ditambahkan
      if (!blocksToReturn.bonus) blocksToReturn.chopped = choppedMesh;
    } else {
      // Jika tidak ada overlap, blok melewatkan target dan dianggap
      // 'MISSED'
      this.state = this.STATES.MISSED;
    }

    // Mengembalikan informasi terkait blok yang ditempatkan dan dipotong
    this.dimension[this.workingDimension] = overlap;
    return blocksToReturn;
  }

  // Metode untuk menggerakkan blok sesuai dengan arah pergerakan
  tick() {
    if (this.state == this.STATES.ACTIVE) {
      let value = this.position[this.workingPlane];
      if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT)
        this.reverseDirection();
      this.position[this.workingPlane] += this.direction;
      this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
    }
  }
}

class Game {
  constructor() {
    // Status permainan yang mungkin
    this.STATES = {
      LOADING: 'loading',
      PLAYING: 'playing',
      READY: 'ready',
      ENDED: 'ended',
      RESETTING: 'resetting',
    };

    // Daftar blok dalam permainan
    this.blocks = [];

    // Status permainan saat ini
    this.state = this.STATES.LOADING;

    // Instance dari kelas Stage (lingkungan permainan)
    this.stage = new Stage();

    // Container utama HTML
    this.mainContainer = document.getElementById('container');

    // Container skor permainan
    this.scoreContainer = document.getElementById('score');

    // Tombol mulai permainan
    this.startButton = document.getElementById('start-button');

    // Petunjuk permainan
    this.instructions = document.getElementById('instructions');

    // Container skor tertinggi
    this.highScoreContainer = document.getElementById('highScore');

    // Skor tertinggi dari penyimpanan lokal
    this.highScore = localStorage.getItem('highScore') || 0;

    // Memperbarui tampilan skor tertinggi
    this.updateHighScore();

    // Menampilkan skor awal
    this.scoreContainer.innerHTML = '0';

    // Grup untuk blok baru, blok ditempatkan, dan blok yang dipotong
    this.newBlocks = new THREE.Group();
    this.placedBlocks = new THREE.Group();
    this.choppedBlocks = new THREE.Group();

    // Menambahkan grup ke lingkungan permainan
    this.stage.add(this.newBlocks);
    this.stage.add(this.placedBlocks);
    this.stage.add(this.choppedBlocks);

    // Menambahkan blok awal ke permainan
    this.addBlock();

    // Memulai fungsi pengupdate-an permainan
    this.tick();

    // Mengatur status permainan awal ke 'READY'
    this.updateState(this.STATES.READY);

    // Mendengarkan event tombol dan input untuk menjalankan aksi
    document.addEventListener('keydown', (e) => {
      if (e.keyCode == 32) this.onAction();
    });
    document.addEventListener('click', (e) => {
      this.onAction();
    });
    document.addEventListener('touchstart', (e) => {
      e.preventDefault();
      // this.onAction();
      // ☝️ ini terpicu setelah klik pada Android sehingga
      // langsung kalah, akan diperbaiki nanti.
    });

    // Mendapatkan elemen audio untuk efek suara
    this.blockPlacedSound = document.getElementById('blockPlacedSound');
  }

  // Metode untuk memperbarui status permainan
  updateState(newState) {
    for (let key in this.STATES)
      this.mainContainer.classList.remove(this.STATES[key]);
    this.mainContainer.classList.add(newState);
    this.state = newState;
  }

  // Metode untuk menjalankan aksi sesuai dengan status permainan
  onAction() {
    switch (this.state) {
      case this.STATES.READY:
        this.startGame();
        break;
      case this.STATES.PLAYING:
        this.placeBlock();
        break;
      case this.STATES.ENDED:
        this.restartGame();
        break;
    }
  }

  // Memulai permainan baru
  startGame() {
    if (this.state != this.STATES.PLAYING) {
      this.scoreContainer.innerHTML = '0';
      this.updateState(this.STATES.PLAYING);
      this.addBlock();
    }
  }

  // Me-restart permainan setelah selesai
  restartGame() {
    this.updateState(this.STATES.RESETTING);

    // Menghapus blok yang sudah ditempatkan dengan animasi
    let oldBlocks = this.placedBlocks.children;
    let removeSpeed = 0.2;
    let delayAmount = 0.02;

    for (let i = 0; i < oldBlocks.length; i++) {
      TweenLite.to(oldBlocks[i].scale, removeSpeed, {
        x: 0,
        y: 0,
        z: 0,
        delay: (oldBlocks.length - i) * delayAmount,
        ease: Power1.easeIn,
        onComplete: () => this.placedBlocks.remove(oldBlocks[i]),
      });
      TweenLite.to(oldBlocks[i].rotation, removeSpeed, {
        y: 0.5,
        delay: (oldBlocks.length - i) * delayAmount,
        ease: Power1.easeIn,
      });
    }

    // Menggeser kamera dengan animasi
    let cameraMoveSpeed = removeSpeed * 2 + oldBlocks.length * delayAmount;
    this.stage.setCamera(2, cameraMoveSpeed);

    // Menghitung mundur untuk menampilkan skor sebelumnya
    let countdown = { value: this.blocks.length - 1 };
    TweenLite.to(countdown, cameraMoveSpeed, {
      value: 0,
      onUpdate: () => {
        this.scoreContainer.innerHTML = String(Math.round(countdown.value));
      },
    });

    // Menghapus blok yang tersisa dan memulai permainan baru setelah animasi
    this.blocks = this.blocks.slice(0, 1);
    setTimeout(() => {
      this.startGame();
    }, cameraMoveSpeed * 1000);
  }

  // Menempatkan blok saat tombol ditekan atau klik
  placeBlock() {
    let currentBlock = this.blocks[this.blocks.length - 1];
    let newBlocks = currentBlock.place();
    this.newBlocks.remove(currentBlock.mesh);

    // Menambahkan blok yang ditempatkan dan memainkan efek suara
    if (newBlocks.placed) {
      this.placedBlocks.add(newBlocks.placed);
      this.blockPlacedSound.play();
    }

    // Menambahkan blok yang dipotong jika ada
    if (newBlocks.chopped) {
      this.choppedBlocks.add(newBlocks.chopped);

      // Menentukan parameter animasi untuk blok yang dipotong
      let positionParams = {
        y: '-=30',
        ease: Power1.easeIn,
        onComplete: () => this.choppedBlocks.remove(newBlocks.chopped),
      };

      let rotateRandomness = 10;
      let rotationParams = {
        delay: 0.05,
        x:
          newBlocks.plane == 'z'
            ? Math.random() * rotateRandomness - rotateRandomness / 2
            : 0.1,
        z:
          newBlocks.plane == 'x'
            ? Math.random() * rotateRandomness - rotateRandomness / 2
            : 0.1,
        y: Math.random() * 0.1,
      };

      // Menyesuaikan posisi dan rotasi blok yang dipotong
      if (
        newBlocks.chopped.position[newBlocks.plane] >
        newBlocks.placed.position[newBlocks.plane]
      ) {
        positionParams[newBlocks.plane] =
          '+=' + 40 * Math.abs(newBlocks.direction);
      } else {
        positionParams[newBlocks.plane] =
          '-=' + 40 * Math.abs(newBlocks.direction);
      }

      // Animasi posisi dan rotasi blok yang dipotong
      TweenLite.to(newBlocks.chopped.position, 1, positionParams);
      TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
    }

    // Menambahkan blok baru setelah blok saat ini ditempatkan
    this.addBlock();
  }

  // Menambahkan blok baru ke permainan
  addBlock() {
    let lastBlock = this.blocks[this.blocks.length - 1];

    // Jika blok sebelumnya melewatkan target, permainan berakhir
    if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
      return this.endGame();
    }

    // Menampilkan skor saat ini
    this.scoreContainer.innerHTML = String(this.blocks.length - 1);

    // Membuat blok baru dan menambahkannya ke permainan
    let newKidOnTheBlock = new Block(lastBlock);
    this.newBlocks.add(newKidOnTheBlock.mesh);
    this.blocks.push(newKidOnTheBlock);

    // Menggeser kamera ke atas dengan setiap blok yang ditambahkan
    this.stage.setCamera(this.blocks.length * 2);

    // Menyembunyikan petunjuk setelah mencapai jumlah blok tertentu
    if (this.blocks.length >= 5) this.instructions.classList.add('hide');
  }

  // Menyelesaikan permainan dengan memperbarui skor tertinggi jika perlu
  endGame() {
    this.updateState(this.STATES.ENDED);

    // Mendapatkan skor saat ini dan menampilkan skor terakhir
    const currentScore = this.blocks.length - 1;
    this.scoreContainer.innerHTML = currentScore;

    // Memperbarui skor tertinggi jika skor saat ini lebih tinggi
    if (currentScore > this.highScore) {
      this.highScore = currentScore;
      localStorage.setItem('highScore', this.highScore);
      this.updateHighScore();
    }
  }

  // Metode untuk mengupdate tampilan skor tertinggi
  updateHighScore() {
    this.highScoreContainer.innerHTML = `High Score: ${this.highScore}`;
  }

  // Metode untuk melakukan pembaruan setiap frame permainan
  tick() {
    // Memperbarui blok yang sedang aktif dan merender lingkungan permainan
    this.blocks[this.blocks.length - 1].tick();
    this.stage.render();

    // Mengulang pembaruan pada setiap frame
    requestAnimationFrame(() => {
      this.tick();
    });
  }
}

// Membuat instance dari kelas Game untuk memulai permainan
let game = new Game();
