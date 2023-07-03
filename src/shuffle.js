function shuffle(array, rndFun) {
  if (!rndFun) rndFun = Math.random;
  // Fisher-Yates shuffle
  // https://stackoverflow.com/a/2450976
  let ix = array.length, randIx;
  while (ix != 0) {
    randIx = Math.floor(rndFun() * ix);
    ix--;
    [array[ix], array[randIx]] = [array[randIx], array[ix]];
  }
  return array;
}

export {shuffle}
