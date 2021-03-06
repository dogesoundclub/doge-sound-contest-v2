pragma solidity ^0.5.6;

interface IDogeSoundContestV2 {
    
    event RegisterCandidate(address indexed register, uint256 indexed _candidate, string slogan, uint256[] mateIds);
    event Vote(address indexed voter, uint256 indexed _candidate, uint256[] mateIds);
    
    function V1() view external returns (address);

    function HOLIDAY_PERIOD() view external returns (uint8);
    function REGISTER_CANDIDATE_PERIOD() view external returns (uint8);
    function VOTE_PERIOD() view external returns (uint8);
    
    function candidateCount(uint256 r) view external returns (uint256);
    function candidate(uint256 r, uint256 index) view external returns (string memory);
    function candidateRegister(uint256 r, uint256 _candidate) view external returns (address);

    function totalVotes(uint256 r) view external returns (uint256);
    function userVotes(uint256 r, address user) view external returns (uint256);
    function votes(uint256 r, uint256 _candidate) view external returns (uint256);
    function mateVoted(uint256 r, address mates, uint256 id) view external returns (bool);
    
    function round() view external returns (uint256);
    function roundBlock(uint256 r) view external returns (uint256);
    function period() view external returns (uint8);
    function remains() view external returns (uint256);
    
    function registerCandidate(string calldata dogeSound, address mates, uint256[] calldata mateIds) external;
    function vote(uint256 _candidate, address mates, uint256[] calldata mateIds) external;
    function elected(uint256 r) view external returns (uint256);

    function mintWinnerNFT(uint256 r) external returns (uint256);
}
