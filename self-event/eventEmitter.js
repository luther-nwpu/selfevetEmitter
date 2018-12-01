function EventEmitter () {
    this.handles = {}
}
EventEmitter.prototype.on = function(type, func) {
    if (!(type in this.handles)) {
        this.handles[type] = []
    }
    console.log(type, typeof func)
    this.handles[type].push(func)
}

EventEmitter.prototype.emit = function() {
    var type = Array.prototype.shift.call(arguments)
    if (!this.handles[type]) {
        return false
    }
    for(var func1 of this.handles[type]) {
        func1.call(this, ...arguments)
    }
} 

EventEmitter.prototype.off = function(type, handle) {
    handles = this.handles[type]
    if(handles) {
        console.log('handles', handles)
        if(!handle) {
            handles.length = 0
        } else {
            for(var i=0; i <handles.length; i++) {
                var _handle = handles[i]
                if (_handle === handle) {
                    handles.splice(i, 1)
                }
            }
        }
    }
}

