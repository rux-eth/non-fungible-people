// SPDX-License-Identifier: MIT
// Author: The Non-Fungible People Project
// Developed by TheBigMort

pragma solidity ^0.8.7;

// openzeppelin imports
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

// local imports
import "./NFPEditions.sol";
import "../interfaces/INFP.sol";

//import "hardhat/console.sol";

contract NFP is ERC1155, ReentrancyGuard, NFPEditions, INFP {
    using Address for address;
    using Strings for uint256;

    string private conURI;
    string public constant name = "NonFungiblePeople";
    string public constant symbol = "NFP";
    uint256 private MAX_MINT = 3;
    uint256 private _claimPrice = 0.02 ether;

    bool private _allStatus;

    constructor() ERC1155("") {}

    function mintPerson(uint256 numMints, uint256 edId)
        external
        payable
        override
        nonReentrant
    {
        (
            ,
            uint256 MAX_SUPPLY,
            ,
            uint256 PUBLIC_TIMESTAMP,
            uint256 price,
            ,
            ,
            bool status,
            uint256 supply,
            ,

        ) = getEdition(edId);

        require(
            block.timestamp >= PUBLIC_TIMESTAMP,
            "Public sale has not started"
        );
        require(allStatus() && status, "Sale is paused");

        uint256 tokenIndex = totalSupply();

        require(
            supply + numMints <= MAX_SUPPLY,
            "New mint exceeds maximum supply"
        );
        require(numMints <= MAX_MINT, "Exceeds maximum number of mints per tx");
        require(msg.value >= price * numMints, "Not enough ether sent");
        if (numMints == 1) {
            _mint(
                _msgSender(),
                tokenIndex,
                1,
                abi.encodePacked(edId.toString())
            );
        } else {
            uint256[] memory tokenIds = new uint256[](numMints);
            uint256[] memory amounts = new uint256[](numMints);
            for (uint256 i = 0; i < numMints; i++) {
                tokenIds[i] = tokenIndex + i;
                amounts[i] = 1;
            }
            _mintBatch(
                _msgSender(),
                tokenIds,
                amounts,
                abi.encodePacked(edId.toString())
            );
        }
        _checkReveal(edId);
        // setStartingIndexBlock();
        delete tokenIndex;
    }

    function claimPerson(
        uint256 nonce,
        uint256 edId,
        bytes memory signature
    ) external payable override nonReentrant {
        (
            ,
            uint256 MAX_SUPPLY,
            ,
            uint256 PUBLIC_TIMESTAMP,
            ,
            ,
            ,
            bool status,
            uint256 supply,
            ,

        ) = getEdition(edId);
        require(
            block.timestamp < PUBLIC_TIMESTAMP,
            "Claiming period is over for this edition"
        );
        require(allStatus() && status, "Sale is paused");
        uint256 tokenIndex = totalSupply();
        address sender = _msgSender();
        address recovered = getSigner(sender, nonce, edId, signature);
        require(nonce == claimNonce(sender), "Incorrect claim nonce");
        require(supply < MAX_SUPPLY, "New mint exceeds max supply");

        require(msg.value >= claimPrice(), "not enough ether sent");
        require(
            recovered == owner() || recovered == admin(),
            "Not allowed to mint"
        );
        _mint(sender, tokenIndex, 1, abi.encodePacked(edId.toString()));
        _claimed(sender, tokenIndex, edId);
        _checkReveal(edId);
        delete tokenIndex;
        delete sender;
        delete recovered;
    }

    function setClaimPrice(uint256 newClaimPrice) external onlyTeam {
        _claimPrice = newClaimPrice;
    }

    function flipAllStatus() external onlyTeam {
        if (!_allStatus) {
            require(_msgSender() == owner(), "Not authorized");
        }
        _allStatus = !_allStatus;
    }

    function manualSetBlock(uint256 edId) external onlyTeam {
        _setEditionStartIndexBlock(edId);
    }

    function setContractURI(string memory newContractURI) external onlyOwner {
        conURI = newContractURI;
    }

    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        require(payable(_msgSender()).send(amount));
        delete amount;
    }

    function claimPrice() public view override returns (uint256) {
        return _claimPrice;
    }

    function allStatus() public view override returns (bool) {
        return _allStatus;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        require(_exists(id), "NFP: Nonexistent token");
        return _getURI(id);
    }

    function contractURI() public view override returns (string memory) {
        return conURI;
    }

    function getSigner(
        address _address,
        uint256 nonce,
        uint256 edId,
        bytes memory signature
    ) internal pure returns (address) {
        return
            ECDSA.recover(
                ECDSA.toEthSignedMessageHash(
                    keccak256(abi.encode(_address, nonce, edId))
                ),
                signature
            );
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        if (from == address(0)) {
            _increaseEditionSupply(st2num(string(data)), ids.length);
        }
    }

    function st2num(string memory numString) private pure returns (uint256) {
        uint256 val = 0;
        bytes memory stringBytes = bytes(numString);
        for (uint256 i = 0; i < stringBytes.length; i++) {
            uint256 exp = stringBytes.length - i;
            bytes1 ival = stringBytes[i];
            uint8 uval = uint8(ival);
            uint256 jval = uval - uint256(0x30);

            val += (uint256(jval) * (10**(exp - 1)));
        }
        return val;
    }
}
