'use strict'


//設定花色圖檔網址
const Symbols = [
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17989/__.png', // 黑桃
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17992/heart.png', // 愛心
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17991/diamonds.png', // 方塊
  'https://assets-lighthouse.alphacamp.co/uploads/image/file/17988/__.png' // 梅花
]
//設定遊戲狀態
const GAME_STATE = {
  //等待翻第一張牌的狀態
  FirstCardAwaits: "FirstCardAwaits",
  //等待翻第二張牌的狀態
  SecondCardAwaits: "SecondCardAwaits",
  //配對失敗的狀態
  CardsMatchFailed: "CardsMatchFailed",
  //配對成功的狀態
  CardsMatched: "CardsMatched",
  //遊戲結束的狀態
  GameFinished: "GameFinished",
}

//特殊函式存放區
const utility = {
  //洗牌函式
  getRandomNumberArray(count) {
    //先產生有count數量的數字陣列，如count是5 ，產生[0,1,2,3,4]
    const number = Array.from(Array(count).keys())
    //從牌組最後一張開始，將其與隨機一張牌交換，如此重複count次
    for (let index = number.length - 1; index > 0; index--) {
      let randomIndex = Math.floor(Math.random() * (index + 1))
        ; //這個分號不可省略，代表Math.floor的結束
      //解構賦值用法 [a,b,c] =[1,2,3]，則Arr[0] = 1 、Arr[1] = 2 、Arr[2] = 3
      [number[index], number[randomIndex]] = [number[randomIndex], number[index]]
    }
    return number
  }

}

//採用MVC架構來寫程式碼
//MVC分為三個物件，Model、View、Controller
//宣告view物件，以此管理所有與「顯示」有關的函式
const view = {
  //取得卡片的內部元素，此function只傳回HTML架構
  //將52張牌以0~51表示
  //getCardElement函式功能：給定一個數字，產生不包含內容的HTML的外框架構，且初始化卡牌為背面
  getCardElement(index) {
    return `
    <div class="card back" data-index="${index}">
    </div>
  `
  },
  //getCardContent函式功能：給定一個0~51數字，產生對應撲克牌花色及數字，並回傳只包含內部架構的HTML
  getCardContent(index) {
    const number = this.transformNumber(index % 13 + 1)  //計算卡牌數字
    const symbol = Symbols[Math.floor(index / 13)] //根據花色取得圖檔
    return `
      <p>${number}</p> 
      <img src="${symbol}" alt="NO IMAGE">
      <p>${number}</p>
  `
  },
  //transformNumber函式功能：給定一個數字，轉為撲克牌的表達方式，如1轉為A，12轉為Q
  transformNumber(number) {
    switch (number) {
      case 1:
        return 'A'
      case 11:
        return 'J'
      case 12:
        return 'Q'
      case 13:
        return 'K'
      default:
        return number
    }
  },
  //displayCards函式功能：給定一個數字陣列如[0,1,2,3]，根據陣列將所有卡牌塞入牌桌的HTML
  displayCards(array) {
    const rootElement = document.querySelector('#cards')
    //生成內容為0~52的陣列 
    rootElement.innerHTML = array.map((index) => { return this.getCardElement(index) }).join('')
  },
  //翻牌的函式
  //flipCards函式功能，給定一張或多張卡牌，改變那張牌的正反面狀態，判斷玩家點擊的是正面或背面，如果是背面將其轉為正面，如果是正面則轉回背面
  //###傳進的參數會被...轉為一陣列
  //運作原理：呼叫此函式時傳進的參數有兩種情形，
  //1.單一參數：傳進的參數會被此函式的...轉換為陣列使得可以被map迭代處理。
  //2.陣列：在呼叫時的陣列必須先用...展開，再被此函式的...轉回陣列，後續以map迭代。
  flipCards(...cards) {
    //將傳進來的陣列用map迭代
    cards.map((card) => {
      //如果是背面
      if (card.classList.contains('back')) {
        //移除back的class
        card.classList.remove('back')
        //呼叫函式添加數字及花色
        card.innerHTML = this.getCardContent(Number(card.dataset.index))
        return
      }
      //如果不是以上狀況就回傳背面
      card.classList.add('back')
      card.innerHTML = null
    })
  },
  //pairCards函式功能：給定一張或多張卡牌，給予卡牌增加成對class，以作變色處理
  pairCards(...cards){
    cards.map((card) =>{
      card.classList.add('paired')
    })
  },

  //randerScore函式功能: 給入一個數字以呼叫此函式，會即時刷新分數的HTML
  randerScore(score){
    document.querySelector('.score').innerHTML = `Score: ${score}`
  },

  //randerTriedTimes函式功能，給入一個數字以呼叫此函式，會即時刷新嘗試次數的HTML
  randerTriedTimes(times){
    
    document.querySelector('.triedTimes').innerHTML = `You've tried: ${times} times`
  },
  //playWrongAnimation函式功能，為指定一個或多個HTML新增動畫class
  playWrongAnimation(...cards){
    cards.map(card =>{
      card.classList.add('wrong')
      //設定一個監聽器，監聽動畫結束，結束之後移除此class
      card.addEventListener('animationend', (event) =>
        event.target.classList.remove('wrong'),{ once:true}
        //once:true 代表此監聽器執行一次之後就移除，避免重複加上監聽器增加瀏覽器負擔
      )
    })
  }




}
//宣告model物件，以此管理所有與「資料」有關的函式
const model = {
  //建立暫存牌組，使用者翻牌後儲存牌的資料於此，再藉此比對有無配對成功，檢查完畢後此暫存牌組需要清空。
  revealedCards: [],

  //isRevealedCardsMatched函式功能：判斷revealedCards的兩張牌數字是否相等，回傳值為布林值
  isRevealedCardsMatched() {
    return this.revealedCards[0].dataset.index % 13 ===
      this.revealedCards[1].dataset.index % 13
  },

  score: 0, //分數
  triedTime: 0, //嘗試次數
}


//宣告controller物件，以此控制流程，推進遊戲狀態，並指派任務給view及model
const controller = {
  //當前狀態：預設為FirstCardAwaits，也就是等待翻第一張牌
  currentState: GAME_STATE.FirstCardAwaits,
  //generateCards函式功能:開始遊戲，發牌階段
  generateCards() {
    view.displayCards(utility.getRandomNumberArray(52))
  },
  //dispatchCardAction函式功能: 動作執行中樞，根據當前的遊戲狀態，發派工作給view和controller
  dispatchCardAction(card) {
    //如果點擊不是點擊在背面的話就直接跳出
    if (!card.classList.contains('back')) {
      return
    }
    //根據當前狀態控制流程
    switch (this.currentState) {
      //如果是等待翻第一張牌的狀態
      case GAME_STATE.FirstCardAwaits:
        //呼叫翻牌函式
        view.flipCards(card)
        //添加翻的牌至暫存牌組
        model.revealedCards.push(card)
        this.currentState = GAME_STATE.SecondCardAwaits
        break
      //如果是等待翻第二張牌的狀態
      case GAME_STATE.SecondCardAwaits:
        //增加嘗試次數
        view.randerTriedTimes(model.triedTime += 1)
        //呼叫翻牌函式
        view.flipCards(card)
        //添加翻的牌至暫存牌組
        model.revealedCards.push(card)
        //判斷是否配對成功
        if (model.isRevealedCardsMatched()) {
          //如果成功
          //增加分數
          view.randerScore(model.score += 10)
          //切換遊戲狀態至CardsMatched
          this.currentState = GAME_STATE.CardsMatched
          view.pairCards(...model.revealedCards)
          
          //必須清空暫存牌組
          model.revealedCards = []
          //如果遊戲分數已達260分
          if(model.score === 260){
              this.currentState = GAME_STATE.GameFinished
              alert('恭喜你，遊戲已完成！')
              return
          }
          //切換遊戲狀態回到FirstCardAwaits
          this.currentState = GAME_STATE.FirstCardAwaits
        } else {
          //如果失敗
          //切換遊戲狀態至CardsMatchFailed
          this.currentState = GAME_STATE.CardsMatchFailed
          //調用動畫
          view.playWrongAnimation(...model.revealedCards)
          //設定1秒後翻回背面
          setTimeout(this.resetCards , 1000) //這裡的1000指的是1000毫秒，也就是1秒
        }
        break

    }

  },
  //resetCards，呼叫此函式時會將暫存牌組裡的牌翻回背面並清空牌庫，使得遊戲回到等待翻第一張牌的狀態
  resetCards(){
    view.flipCards(...model.revealedCards)

    //必須清空暫存牌組
    model.revealedCards = []
    //切換遊戲狀態回到FirstCardAwaits
    controller.currentState = GAME_STATE.FirstCardAwaits
  }






}
//由controller統一呼叫
controller.generateCards()



//為每一個card新增監聽器
//選取所有class為card的HTML，因querySelectorAll回傳為類陣列(Array-like)，類陣列沒有map方法可以使用，注意遍歷的方法用forEach，使用map的話則會引發no method錯誤。
document.querySelectorAll('.card').forEach((card) => {
  card.addEventListener('click', (event) => {

    controller.dispatchCardAction(card)

  })
})

