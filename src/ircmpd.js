export default class IRCMPD {
	constructor(){
		this.queue_ = [];
	}

	search (value) {
		return "Searching for " + value;
	}

	queue (song_id) {
		this.queue_.push(song_id);
		return "Queued " + song_id;
	}

	queue_clear() {
		this.queue_ = [];
		return "Queue cleared";
	}

	list (){
		return "Queue: " + this.queue_.join();
	}
};

