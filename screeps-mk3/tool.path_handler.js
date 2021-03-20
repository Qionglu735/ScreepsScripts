
let path_handler = {
    status_find: function(creep, target, action_status, distance, close_range) {
        switch(action_status) {
            case OK:
            case ERR_TIRED:
                break;
            case ERR_NOT_IN_RANGE:
                if(creep.pos.getRangeTo(target.pos) < close_range) {
                    let moveTo_status = creep.moveTo(target.pos);
                    switch(moveTo_status) {
                        case OK:
                        case ERR_TIRED:
                            break;
                        case ERR_NO_PATH:
                            creep.say("Jam");
                            break;
                        default:
                            creep.say(moveTo_status);
                    }
                }
                else {
                    let pathFinder = PathFinder.search(creep.pos, {pos: target.pos, range: distance});
                    if(pathFinder.incomplete === false || pathFinder.path.length > 0) {
                        creep.memory.path_list = pathFinder.path;
                        let moveTo_status = creep.moveTo(creep.memory.path_list[0]);
                        switch(moveTo_status) {
                            case OK:
                            case ERR_TIRED:
                                break;
                            case ERR_NO_PATH:
                                creep.say("Jam");
                                break;
                            default:
                                creep.say(moveTo_status);
                        }
                    }
                    else {
                        creep.say("No Path");
                    }
                }
                break;
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.target_id = "";
                break;
            default:
                creep.say(action_status);
        }
    },
    move: function(creep) {
        let pos = new RoomPosition(creep.memory.path_list[0].x,
            creep.memory.path_list[0].y,
            creep.memory.path_list[0].roomName);
        while(creep.memory.path_list.length > 1 && (pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49)) {
            creep.memory.path_list.shift();
            pos = new RoomPosition(creep.memory.path_list[0].x,
                creep.memory.path_list[0].y,
                creep.memory.path_list[0].roomName);
        }  // avoid blinking at room edge
        if(creep.memory.path_list.length === 1 && (pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49)) {
            if(pos.x === 0 || pos.x === 49) {
                if (pos.x === 0) {
                    pos.x += 1;
                }
                if (pos.x === 49) {
                    pos.x -= 1;
                }
                if(this.get_cost_matrix(pos.roomName).get(pos.x, pos.y) < 255) {

                }
                else if (this.get_cost_matrix(pos.roomName).get(pos.x, pos.y - 1) < 255) {
                    pos.y -= 1;
                }
                else if (this.get_cost_matrix(pos.roomName).get(pos.x, pos.y + 1) < 255) {
                    pos.y -= 1;
                }
            }
            if(pos.y === 0 || pos.y === 49) {
                if(pos.y === 0) {
                    pos.y += 1;
                }
                if(pos.y === 49) {
                    pos.y -= 1;
                }
                if(this.get_cost_matrix(pos.roomName).get(pos.x, pos.y) < 255) {

                }
                else if (this.get_cost_matrix(pos.roomName).get(pos.x - 1, pos.y) < 255) {
                    pos.x -= 1;
                }
                else if (this.get_cost_matrix(pos.roomName).get(pos.x + 1, pos.y) < 255) {
                    pos.x -= 1;
                }
            }
        }  // if target pos is on edge, move in one step
        let move_status = creep.moveTo(pos);
        switch(move_status) {
            case OK:
                if((creep.pos.x - pos.x) ** 2 + (creep.pos.y - pos.y) ** 2 <= 2
                    && creep.pos.roomName === pos.roomName) {
                    creep.memory.path_list.shift();
                }
                break;
            case ERR_TIRED:
                break;
            case ERR_NO_PATH:
                creep.memory.path_list = null;
                break;
            default:
                creep.say(move_status);
        }
    },
    find: function(creep, target, distance, close_range) {
        this.find_pos(creep, target.pos, distance, close_range);
    },
    find_pos: function(creep, pos, distance, close_range) {
        if(creep.pos.getRangeTo(pos) < close_range) {
            let moveTo_status = creep.moveTo(pos);
            switch(moveTo_status) {
                case OK:
                case ERR_TIRED:
                    break;
                case ERR_NO_PATH:
                    creep.say("Jam");
                    break;
                default:
                    creep.say(moveTo_status);
            }
        }
        else {
            let pathFinder = PathFinder.search(creep.pos, {pos: pos, range: distance}, {
                roomCallback: function(room_name) {
                    return path_handler.get_cost_matrix(room_name);
                }
            });
            if(pathFinder.incomplete === false || pathFinder.path.length > 0) {
                creep.memory.path_list = pathFinder.path;
                let moveTo_status = creep.moveTo(creep.memory.path_list[0]);
                switch(moveTo_status) {
                    case OK:
                    case ERR_TIRED:
                        creep.memory.path_list.shift();
                        break;
                    case ERR_NO_PATH:
                        creep.say("Jam");
                        break;
                    default:
                        creep.say(moveTo_status);
                }
            }
            else {
                creep.say("No Path");
            }
        }
    },

    get_cost_matrix: function(room_name, update=0) {
        let cost_matrix = new PathFinder.CostMatrix;
        let room = Game.rooms[room_name]
        if(room != null) {
            let room_memory = Memory.room_dict[room_name];
            if(room_memory.cost_matrix == null || update !== 0) {
                room.find(FIND_STRUCTURES).forEach(function (struct) {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        cost_matrix.set(struct.pos.x, struct.pos.y, 1);
                    }
                    else if (struct.structureType !== STRUCTURE_CONTAINER
                        && (struct.structureType !== STRUCTURE_RAMPART || !struct.my)) {
                        cost_matrix.set(struct.pos.x, struct.pos.y, 255);
                    }
                });
                if (Memory.main_room_list.includes(room_name)) {
                    for (let container_id of room_memory.container_list) {
                        let container = Game.getObjectById(container_id);
                        cost_matrix.set(container.pos.x, container.pos.y, 255);
                    }
                    if (room_memory.spawn_list.length > 0) {
                        let main_spawn = Game.spawns[room_memory.spawn_list[0]];
                        for (let i in room_memory.extension_table) {
                            if (room_memory.extension_table.hasOwnProperty(i)) {
                                cost_matrix.set(main_spawn.pos.x + room_memory.extension_table[i][0],
                                    main_spawn.pos.y + room_memory.extension_table[i][1], 255);
                            }
                        }
                        for (let i in room_memory.storage_table) {
                            if (room_memory.storage_table.hasOwnProperty(i)) {
                                cost_matrix.set(main_spawn.pos.x + room_memory.storage_table[i][0],
                                    main_spawn.pos.y + room_memory.storage_table[i][1], 255);
                            }
                        }
                        for (let i in room_memory.tower_table) {
                            if (room_memory.tower_table.hasOwnProperty(i)) {
                                cost_matrix.set(main_spawn.pos.x + room_memory.tower_table[i][0],
                                    main_spawn.pos.y + room_memory.tower_table[i][1], 255);
                            }
                        }
                    }
                }
                room_memory.cost_matrix = cost_matrix.serialize();
            }
            else {
                cost_matrix = PathFinder.CostMatrix.deserialize(room_memory.cost_matrix);
            }
        }
        return cost_matrix;
    }
};

module.exports = path_handler;
