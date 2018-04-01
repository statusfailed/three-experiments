function keyCodeToIndex(event) {
  var keyCode = event.which;

  // wasdeq
  const codes = [87, 83, 65, 68, 81, 69];
  var ret = codes.findIndex(x => x == keyCode);
  return ret === -1 ? null : ret;
}
