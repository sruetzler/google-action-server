

class Fridge{
    constructor(){

    }


    close (){

    }
    use (expressApp){
		expressApp.use(express.static('./fridge/static'));

    }
}


module.exports = Fridge