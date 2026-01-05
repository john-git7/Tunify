import React from "react";
import Home  from "./Home";
import { Player } from "./Player";

function PlayerContainer({ currentSong, setCurrentSong, selectedStem, setSelectedStem }) {
  return (
    <>
      <Home onSongClick={setCurrentSong} />
      {currentSong && (
        <Player
          currentSong={currentSong}
          selectedStem={selectedStem}
          setSelectedStem={setSelectedStem}
        />
      )}
    </>
  );
}

export { PlayerContainer };
