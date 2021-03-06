export default {
    async mounted(){
        if(this.$cookies.get("token")){
            this.$socket.on('needToUpdateAfterOffline', async (object) => {
                let newTimeOfUpdate = 0
                this.$store.state.online = true
                this.$socket.connected = true
                this.$socket.disconnected = false
                this.synchroPercent = 0
                this.showSynchroNeedMoreTime = false
                setTimeout(() => this.showSynchroNeedMoreTime = true, 3500)
                const lastUpdated = localStorage.getItem('lastUpdated')
            
                this.synchroPercent++
                if(this.$store.state.online && object.lastUpdated.product > lastUpdated || await this.$getIndexedDBbyID('whatToUpdate', 'product')){
                    newTimeOfUpdate = object.lastUpdated.product
                    this.synchroMessage = true;
                    await this.$synchronizationAfterOffline(object.lastUpdated.product > lastUpdated, "product");
                    if(!this.$store.state.online) await this.$addIndexedDB("whatToUpdate", [{"_id": "product"}]);
                }
                this.synchroPercent++
                if(this.$store.state.online && object.lastUpdated.favourite_product > lastUpdated || await this.$getIndexedDBbyID('whatToUpdate', 'favourite_product')){
                    newTimeOfUpdate = object.lastUpdated.favourite_product
                    this.synchroMessage = true;
                    await this.$synchronizationAfterOffline(object.lastUpdated.favourite_product > lastUpdated, "favourite_product");
                    if(!this.$store.state.online) await this.$addIndexedDB("whatToUpdate", [{"_id": "favourite_product"}]);
                }
                this.synchroPercent++
                if(this.$store.state.online && object.lastUpdated.exercise > lastUpdated || await this.$getIndexedDBbyID('whatToUpdate', 'exercise')){
                    newTimeOfUpdate = object.lastUpdated.exercise
                    this.synchroMessage = true;
                    await this.$synchronizationAfterOffline(object.lastUpdated.exercise > lastUpdated, "exercise");
                    if(!this.$store.state.online) await this.$addIndexedDB("whatToUpdate", [{"_id": 'exercise'}]);
                }
                this.synchroPercent++
                if(this.$store.state.online && object.lastUpdated.workout_plan > lastUpdated || await this.$getIndexedDBbyID('whatToUpdate', 'workout_plan')){
                    newTimeOfUpdate = object.lastUpdated.workout_plan
                    this.synchroMessage = true;
                    await this.$synchronizationAfterOffline(object.lastUpdated.workout_plan > lastUpdated, "workout_plan", "workout_result", "workout_plan_ID");
                    if(!this.$store.state.online) await this.$addIndexedDB("whatToUpdate", [{"_id": "workout_plan"}]);
                }
                
                this.synchroPercent++
                if(this.$store.state.online && object.lastUpdated.daily_measurement > lastUpdated || await this.$getIndexedDBbyID('whatToUpdate', 'daily_measurement')){
                    newTimeOfUpdate = object.lastUpdated.daily_measurement
                    this.synchroMessage = true;
                    await this.$daily_measurementAfterOffline(object.lastUpdated.daily_measurement > lastUpdated);
                    if(!this.$store.state.online) await this.$addIndexedDB("whatToUpdate", [{"_id": "daily_measurement"}]);
                }
                
                this.synchroPercent++
                if(this.$store.state.online && object.lastUpdated.settings > lastUpdated || await this.$getIndexedDBbyID('whatToUpdate', 'settings')){
                    newTimeOfUpdate = object.lastUpdated.settings
                    this.synchroMessage = true;
                    await this.$refreshToken();
                }
                
                if(this.$store.state.online){
                    localStorage.removeItem('last_offline_created_daily_measurement_date')
                    if(localStorage.getItem('version') < object.versionOFapplication){
                        if('serviceWorker' in navigator){
                            try{
                                await navigator.serviceWorker.register('./service-worker.js').then(async registration => {
                                    await registration.unregister().then(function(){
                                        localStorage.setItem('version', object.versionOFapplication)
                                        localStorage.removeItem('componentsLoaded')
                                    });
                                });
                            }catch(err){
                                console.log(err)
                            }
                        }
                    }
                    if(object.lastUpdated.logout > lastUpdated) await this.$logout();
                    if(newTimeOfUpdate > 0) localStorage.setItem('lastUpdated', newTimeOfUpdate)
                    if(object.lastUpdated.refresh > lastUpdated){
                        localStorage.setItem('lastUpdated', object.lastUpdated.refresh)
                        window.location.reload(true);
                    }
                    this.$store.state.number_of_messages = object.lastUpdated.message.number_of_messages
                    this.$store.state.last_message_time = object.lastUpdated.message.last_message_time
                }
                this.synchroPercent++
                this.synchroMessage = false
            })
            
            this.$socket.on('disconnect', () => {
                this.$store.state.online = false;
                this.synchroMessage = false;
                this.$socket.connected = false;
                this.$socket.disconnected = true;
            })
            
            this.$socket.on('SynchronizationFromDiffDevice', async (value) => {
                if(value.where == 'refresh') window.location.reload(true);
                else if(value.where == "message") this.$store.state.number_of_messages = value.number_of_messages
                else if(value.where == "logout") await this.$logout()
                else if(value.where == "settings"){
                    this.$cookies.set("token", value.array, "200y")
                    this.$store.state.userToken = this.$decodeToken(value.array)
                }else if(value.where == "daily_measurement"){
                    for(let i=0;i<value.array.length;i++){
                        await this.$deleteIndexedDB(value.where, value.array[i].whenAdded)
                    }
                    await this.$deleteCachedWorkoutResultsForThoseMeasurements(value.array)
                    await this.$addIndexedDB(value.where, value.array)
                }else{
                    for(let i=0;i<value.array.length;i++){
                        await this.$deleteIndexedDB(value.where, value.array[i]._id)
                    }
                    if(value.WhatToDo == "add" || value.WhatToDo == "change") await this.$addIndexedDB(value.where, value.array)
                }
                this.$store.state[value.where+"FLAG"] = await this.$currentTime() // Refreshing component where changed value
                localStorage.setItem('lastUpdated', value.time)
            })
            
            this.$deleteCachedWorkoutResultsForThoseMeasurements = async (array) => {
                return new Promise(resolve => {
                    (async () => {
                        if(array.length>0){
                            for(let i=0; i<array.length; i++){
                                if(array[i].workout_result && array[i].workout_result.length>0){
                                    for(let a=0; a<array[i].workout_result.length; a++){
                                        await this.$deleteIndexedDB("workout_result", array[i].workout_result[a]._id)
                                    }
                                }
                            }
                        }
                        resolve()
                    })()
                })
            }
            
            this.$synchronizationAfterOffline = async (isNewValueInDB, where, whatToUpdate, value, whatToUpdate2) => {
                return new Promise(resolve => {
                    (async () => {
                        let deleted = []
                        let changed = []
                        let inserted = []
                        let whereArray = await this.$getAllIndexedDB(where)
                        if(isNewValueInDB) await this.$selectFROM(true, where, null, null, null, null, true) // Donwload new value from DB
                        if(whereArray.length>0){
                            for(let i=0;i<whereArray.length;i++){
                                if(!whereArray[i].notSAVED){
                                    if(!(await this.$is_id(whereArray[i]._id))) inserted.push(whereArray[i]) // Seperating new value
                                    else if(whereArray[i].deleted) deleted.push(whereArray[i]) // Seperating deleted value
                                    else if(whereArray[i].changed) changed.push(whereArray[i]) // Seperating changed value
                                }
                            }
                        }
                        if(inserted.length>0) await this.$insertThoseIDStoDB(where, inserted, whatToUpdate, value, "_id", whatToUpdate2)
                        if(changed.length>0) await this.$overwriteThoseIDSinDB(where, changed)
                        if(deleted.length>0) await this.$deleteThoseIDSfromDB(where, deleted, isNewValueInDB)
                        await this.$deleteIndexedDB("whatToUpdate", where) // Deleting from need to update indexedDB holder
                        this.$store.state[where+"FLAG"] = await this.$currentTime() // Refreshing flag for changed value to refresh components
                        resolve();
                    })();
                });
            }
            
            this.$daily_measurementAfterOffline = async (newVALUEinDB) => {
                return new Promise(resolve => {
                    (async () => {
                        let daily_measurement = await this.$getAllIndexedDB('daily_measurement')
                        let inserted = []
                        let changed = []
                        if(daily_measurement.length>0){
                            for(let i=0;i<daily_measurement.length;i++){
                                if(await this.$shortDATE(daily_measurement[i].whenAdded) >= this.$dateMINlimit){ // Check if date is bigger than limit
                                    if(!(await this.$is_id(daily_measurement[i]._id))) inserted.push(daily_measurement[i])
                                    else if(daily_measurement[i].changed) changed.push(daily_measurement[i])
                                }
                            }
                        }
                        if(newVALUEinDB){ // If there is new value in DB, need to check if there is not already the same date
                            await this.$deleteCachedWorkoutResultsForThoseMeasurements(await this.$selectFROM(true, 'daily_measurement', null, await this.$addDAYStoISO(await this.$getCorrectDate(), this.$valueFORdateMINlimit), null, null, true))
                            if(inserted.length>0){    
                                for(let i=0;i<inserted.length;i++){
                                    const doesDateIsAlreadyInDB = await this.$getIndexedDBbyID('daily_measurement', inserted[i].whenAdded) // Checking if there is the date already
                                    if(doesDateIsAlreadyInDB){ // If user already had the date, the new date get some values and change from inserted => changed
                                        inserted[i]._id = doesDateIsAlreadyInDB._id
            
                                        if(doesDateIsAlreadyInDB.weight && !inserted[i].weight) inserted[i].weight = doesDateIsAlreadyInDB.weight
                                        if(doesDateIsAlreadyInDB.weight_description && !inserted[i].weight_description) inserted[i].weight_description = doesDateIsAlreadyInDB.weight_description
                                        if(doesDateIsAlreadyInDB.neck && !inserted[i].neck) inserted[i].neck = doesDateIsAlreadyInDB.neck
                                        if(doesDateIsAlreadyInDB.shoulders && !inserted[i].shoulders) inserted[i].shoulders = doesDateIsAlreadyInDB.shoulders
                                        if(doesDateIsAlreadyInDB.chest && !inserted[i].chest) inserted[i].chest = doesDateIsAlreadyInDB.chest
                                        if(doesDateIsAlreadyInDB.biceps && !inserted[i].biceps) inserted[i].biceps = doesDateIsAlreadyInDB.biceps
                                        if(doesDateIsAlreadyInDB.waist && !inserted[i].waist) inserted[i].waist = doesDateIsAlreadyInDB.waist
                                        if(doesDateIsAlreadyInDB.hips && !inserted[i].hips) inserted[i].hips = doesDateIsAlreadyInDB.hips
                                        if(doesDateIsAlreadyInDB.thigh && !inserted[i].thigh) inserted[i].thigh = doesDateIsAlreadyInDB.thigh
                                        if(doesDateIsAlreadyInDB.calf && !inserted[i].calf) inserted[i].calf = doesDateIsAlreadyInDB.calf
                                        if(doesDateIsAlreadyInDB.water && !inserted[i].water) inserted[i].water = doesDateIsAlreadyInDB.water
            
                                        if(doesDateIsAlreadyInDB.nutrition_diary && !inserted[i].nutrition_diary) inserted[i].nutrition_diary = doesDateIsAlreadyInDB.nutrition_diary
                                        else if(doesDateIsAlreadyInDB.nutrition_diary && inserted[i].nutrition_diary) inserted[i].nutrition_diary = inserted[i].nutrition_diary.concat(doesDateIsAlreadyInDB.nutrition_diary)
            
                                        if(doesDateIsAlreadyInDB.workout_result && !inserted[i].workout_result) inserted[i].workout_result = doesDateIsAlreadyInDB.workout_result
                                        else if(doesDateIsAlreadyInDB.workout_result && inserted[i].workout_result) inserted[i].workout_result = inserted[i].workout_result.concat(doesDateIsAlreadyInDB.workout_result)
            
                                        changed.push(inserted[i])
                                        inserted.splice(i, 1)
                                    }
                                }
                            }
                        }
                        if(inserted.length>0) await this.$insertThoseIDStoDB('daily_measurement', inserted, '', '', 'whenAdded')
                        if(changed.length>0){
                            if(newVALUEinDB){
                                for(let i=0; i<changed.length; i++){
                                    let doesDateIsAlreadyInDB = await this.$getIndexedDBbyID("daily_measurement", changed[i].whenAdded)
                                    if(doesDateIsAlreadyInDB){
                                        if(doesDateIsAlreadyInDB.weight && !changed[i].weight) changed[i].weight = doesDateIsAlreadyInDB.weight
                                        if(doesDateIsAlreadyInDB.weight_description && !changed[i].weight_description) changed[i].weight_description = doesDateIsAlreadyInDB.weight_description
                                        if(doesDateIsAlreadyInDB.neck && !changed[i].neck) changed[i].neck = doesDateIsAlreadyInDB.neck
                                        if(doesDateIsAlreadyInDB.shoulders && !changed[i].shoulders) changed[i].shoulders = doesDateIsAlreadyInDB.shoulders
                                        if(doesDateIsAlreadyInDB.chest && !changed[i].chest) changed[i].chest = doesDateIsAlreadyInDB.chest
                                        if(doesDateIsAlreadyInDB.biceps && !changed[i].biceps) changed[i].biceps = doesDateIsAlreadyInDB.biceps
                                        if(doesDateIsAlreadyInDB.waist && !changed[i].waist) changed[i].waist = doesDateIsAlreadyInDB.waist
                                        if(doesDateIsAlreadyInDB.hips && !changed[i].hips) changed[i].hips = doesDateIsAlreadyInDB.hips
                                        if(doesDateIsAlreadyInDB.thigh && !changed[i].thigh) changed[i].thigh = doesDateIsAlreadyInDB.thigh
                                        if(doesDateIsAlreadyInDB.calf && !changed[i].calf) changed[i].calf = doesDateIsAlreadyInDB.calf
                                        if(doesDateIsAlreadyInDB.water && !changed[i].water) changed[i].water = doesDateIsAlreadyInDB.water
            
                                        if(doesDateIsAlreadyInDB.nutrition_diary && !changed[i].nutrition_diary) changed[i].nutrition_diary = doesDateIsAlreadyInDB.nutrition_diary
                                        else if(doesDateIsAlreadyInDB.nutrition_diary && changed[i].nutrition_diary){
                                            if(changed[i].nutrition_diary.length>0){
                                                for(let a=0; a<changed[i].nutrition_diary.length; a++){
                                                    if(changed[i].nutrition_diary[a].deleted) doesDateIsAlreadyInDB.nutrition_diary = doesDateIsAlreadyInDB.nutrition_diary.filter(x => x._id != changed[i].nutrition_diary[a]._id)
                                                    else if(!await this.$is_id(changed[i].nutrition_diary[a]._id)) doesDateIsAlreadyInDB.nutrition_diary.push(changed[i].nutrition_diary[a])
                                                    else if(changed[i].nutrition_diary[a].changed){
                                                        const indexNumber = doesDateIsAlreadyInDB.nutrition_diary.findIndex(x => x._id == changed[i].nutrition_diary[a]._id)
                                                        if(parseInt(indexNumber) >= 0) doesDateIsAlreadyInDB.nutrition_diary[indexNumber] = changed[i].nutrition_diary[a]
                                                    }
                                                }
                                            }
                                            changed[i].nutrition_diary = doesDateIsAlreadyInDB.nutrition_diary
                                        }
            
                                        if(doesDateIsAlreadyInDB.workout_result && !changed[i].workout_result) changed[i].workout_result = doesDateIsAlreadyInDB.workout_result
                                        else if(doesDateIsAlreadyInDB.workout_result && changed[i].workout_result){
                                            if(changed[i].workout_result.length.length>0){
                                                for(let a=0; a<changed[i].workout_result.length; a++){
                                                    if(changed[i].workout_result[a].deleted) doesDateIsAlreadyInDB.workout_result = doesDateIsAlreadyInDB.workout_result.filter(x => x._id != changed[i].workout_result[a]._id)
                                                    else if(!await this.$is_id(changed[i].workout_result[a]._id)) doesDateIsAlreadyInDB.workout_result.push(changed[i].workout_result[a])
                                                    else if(changed[i].workout_result[a].changed){
                                                        const indexNumber = doesDateIsAlreadyInDB.workout_result.findIndex(x => x._id == changed[i].workout_result[a]._id)
                                                        if(parseInt(indexNumber) >= 0) doesDateIsAlreadyInDB.workout_result[indexNumber] = changed[i].workout_result[a]
                                                    }
                                                }
                                            }
                                            changed[i].workout_result = doesDateIsAlreadyInDB.workout_result
                                        }
                                    }
                                }
                            }
                            await this.$overwriteThoseIDSinDB("daily_measurement", changed, false, 'whenAdded')
                        }
                        await this.$deleteIndexedDB("whatToUpdate", 'daily_measurement')
                        this.$store.state.daily_measurementFLAG = await this.$currentTime()
                        resolve();
                    })();
                });
            }
        }
    }
}