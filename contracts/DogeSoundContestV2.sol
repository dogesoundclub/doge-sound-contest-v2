pragma solidity ^0.5.6;

import "./klaytn-contracts/token/KIP17/IKIP17Enumerable.sol";
import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./interfaces/IDogeSoundContestV2.sol";
import "./DogeSoundsWinners.sol";

contract DogeSoundContestV2 is Ownable, IDogeSoundContestV2 {
    using SafeMath for uint256;

    address public constant V1 = 0x90B1a227A69b3A907167fFE7956dc965117CBF20;
    
    uint8 public constant HOLIDAY_PERIOD = 0;
    uint8 public constant REGISTER_CANDIDATE_PERIOD = 1;
    uint8 public constant VOTE_PERIOD = 2;

    DogeSoundsWinners public winnerNFT;
    mapping(address => bool) public matesAllowed;

    function allowMates(address mates) onlyOwner external {
        matesAllowed[mates] = true;
    }

    function disallowMates(address mates) onlyOwner external {
        matesAllowed[mates] = false;
    }

    uint256 public checkpoint;
    uint256 public checkpointRound;
    
    uint256 public holidayInterval = uint256(-1);
    uint256 public candidateInterval = uint256(-1);
    uint256 public candidateMateCount = 5;
    uint256 public voteInterval = uint256(-1);

    mapping(uint256 => string[]) public candidates;
    mapping(uint256 => mapping(uint256 => address)) public candidateRegister;

    mapping(uint256 => uint256) public totalVotes;
    mapping(uint256 => mapping(address => uint256)) public userVotes;
    mapping(uint256 => mapping(uint256 => uint256)) public votes;
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public mateVoted;

    constructor(uint256 _checkpoint, DogeSoundsWinners _winnerNFT) public {
        checkpoint = _checkpoint;
        winnerNFT = _winnerNFT;
    }

    function candidateCount(uint256 r) view external returns (uint256) {
        return candidates[r].length;
    }

    function candidate(uint256 r, uint256 index) view external returns (string memory) {
        return candidates[r][index];
    }

    function changeCheckpoint() internal {
        if (holidayInterval != uint256(-1) && candidateInterval != uint256(-1) && voteInterval != uint256(-1)) {
            uint256 interval = holidayInterval.add(candidateInterval).add(voteInterval);
            uint256 blocks = block.number.sub(checkpoint);
            checkpointRound = checkpointRound.add(blocks.div(interval));
            checkpoint = block.number.sub(blocks.mod(interval));
        }
    }

    function setHolidayInterval(uint256 interval) onlyOwner external {
        changeCheckpoint();
        holidayInterval = interval;
    }

    function setCandidateInterval(uint256 interval) onlyOwner external {
        changeCheckpoint();
        candidateInterval = interval;
    }

    function setVoteInterval(uint256 interval) onlyOwner external {
        changeCheckpoint();
        voteInterval = interval;
    }

    function setCandidateMateCount(uint256 count) onlyOwner external {
        candidateMateCount = count;
    }

    function round() view public returns (uint256) {
        return checkpointRound.add(block.number.sub(checkpoint).div(holidayInterval.add(candidateInterval).add(voteInterval)));
    }

    function roundBlock(uint256 r) view external returns (uint256) {
        return r.sub(checkpointRound).mul(holidayInterval.add(candidateInterval).add(voteInterval)).add(checkpoint);
    }

    function voteMate(uint256 r, address _mates, uint256[] memory mateIds) internal {
        require(matesAllowed[_mates] == true);
        
        mapping(uint256 => bool) storage voted = mateVoted[r][_mates];
        IKIP17Enumerable mates = IKIP17Enumerable(_mates);

        uint256 length = mateIds.length;
        for (uint256 index = 0; index < length; index = index.add(1)) {
            uint256 id = mateIds[index];
            require(mates.ownerOf(id) == msg.sender && voted[id] != true);
            voted[id] = true;
        }
    }

    function period() view public returns (uint8) {
        uint256 remain = block.number.sub(checkpoint).mod(holidayInterval.add(candidateInterval).add(voteInterval));
        if (remain >= holidayInterval.add(candidateInterval)) {
            return VOTE_PERIOD;
        } else if (remain >= holidayInterval) {
            return REGISTER_CANDIDATE_PERIOD;
        } else {
            return HOLIDAY_PERIOD;
        }
    }

    function remains() view public returns (uint256) {
        uint256 remain = block.number.sub(checkpoint).mod(holidayInterval.add(candidateInterval).add(voteInterval));
        if (remain >= holidayInterval.add(candidateInterval)) {
            return voteInterval.sub(remain.sub(holidayInterval).sub(candidateInterval));
        } else if (remain >= holidayInterval) {
            return candidateInterval.sub(remain.sub(holidayInterval));
        } else {
            return holidayInterval.sub(remain);
        }
    }

    function registerCandidate(string calldata slogan, address mates, uint256[] calldata mateIds) external {
        uint256 count = mateIds.length;
        require(period() == REGISTER_CANDIDATE_PERIOD && count >= candidateMateCount);

        uint256 r = round();
        voteMate(r, mates, mateIds);

        uint256 _candidate = candidates[r].length;
        candidateRegister[r][_candidate] = msg.sender;
        candidates[r].push(slogan);
        totalVotes[r] = totalVotes[r].add(count);
        userVotes[r][msg.sender] = userVotes[r][msg.sender].add(count);
        votes[r][_candidate] = count;
    }

    function vote(uint256 _candidate, address mates, uint256[] calldata mateIds) external {
        require(period() == VOTE_PERIOD);

        uint256 r = round();
        require(_candidate < candidates[r].length);

        voteMate(r, mates, mateIds);
        
        uint256 count = mateIds.length;
        totalVotes[r] = totalVotes[r].add(count);
        userVotes[r][msg.sender] = userVotes[r][msg.sender].add(count);
        votes[r][_candidate] = votes[r][_candidate].add(count);
    }

    function elected(uint256 r) view public returns (uint256) {

        uint256 _candidateCount = candidates[r].length;
        uint256 maxVote = 0;
        uint256 electedCandidate = 0;

        for (uint256 _candidate = 0; _candidate < _candidateCount; _candidate = _candidate.add(1)) {
            uint256 v = votes[r][_candidate];
            if (maxVote < v) {
                maxVote = v;
                electedCandidate = _candidate;
            }
        }

        return electedCandidate;
    }
    
    function mintWinnerNFT(uint256 r) external returns (uint256) {
        uint256 index = elected(r);
        require(candidateRegister[r][index] == msg.sender);
        winnerNFT.mint(msg.sender, r, candidates[r][index]);
        return r;
    }
}
