class Room {
    constructor() {

        this.persons = [],
            this.chathistory = {
                logs: [],
                highlight: [],
                handle: [],
                pre_chat: ''
            },


            this.submitalert = false,
            this.acceptalert = false,
            this.rejectalert = false,
            this.submitbuttondisable = false,
            this.acceptbuttondisable = true,
            this.selectedlanguage = 0,
            this.code = '',
            this.question = ''
    }

}
module.exports = Room; 