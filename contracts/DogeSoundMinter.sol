pragma solidity ^0.5.6;

import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./DogeSoundWinners.sol";

contract DogeSoundMinter is Ownable {
    using SafeMath for uint256;

    event SetSigner(address indexed signer);

    DogeSoundWinners public winnerNFT;
    address public signer;

    constructor(DogeSoundWinners _winnerNFT, address _signer) public {
        winnerNFT = _winnerNFT;
        signer = _signer;
    }
    
    function setSigner(address _signer) onlyOwner external {
        signer = _signer;
        emit SetSigner(_signer);
    }

    function mintWinnerNFT(uint256 round, string memory dogesound, bytes memory signature) public {
        require(signature.length == 65, "invalid signature length");

        bytes32 hash = keccak256(abi.encodePacked(msg.sender, round, dogesound));
        bytes32 message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
            "invalid signature 's' value"
        );
        require(v == 27 || v == 28, "invalid signature 'v' value");

        require(ecrecover(message, v, r, s) == signer);

        winnerNFT.mint(msg.sender, round, dogesound);
    }
}
